import { createClient } from '@supabase/supabase-js';
import { Release, Track, Label, PayoutMethod, UserProfile, SupportTicket, Transaction, Artist, DspChannel } from '../types';

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase Environment Variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPER FUNCTIONS ---

const handleError = (error: any) => {
  console.error("API Error:", error);
  throw new Error(error.message || "An unexpected error occurred");
};

/**
 * Securely retrieves the current authenticated User ID.
 * Throws an error if no session exists.
 */
const getUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated. Session invalid.");
  return user.id;
};

// --- API EXPORT ---

export const api = {
  auth: {
    login: async (email: string, pass: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) throw error;

      // Fetch profile details after auth
      const profile = await api.auth.getProfile();
      return { token: data.session.access_token, user: profile };
    },

    getProfile: async () => {
      const userId = await getUserId();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },

    updateProfile: async (updates: Partial<UserProfile>) => {
      const userId = await getUserId();

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    }
  },

  storage: {
    upload: async (file: File): Promise<string> => {
      try {
        await getUserId(); // Ensure auth

        const { data: signData, error: signError } = await supabase.functions.invoke('upload-signer', {
          body: {
            filename: file.name,
            fileType: file.type
          }
        });

        if (signError) throw signError;

        const uploadResponse = await fetch(signData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload asset to storage node.');
        }

        return signData.publicUrl;
      } catch (err) {
        handleError(err);
        return "";
      }
    }
  },

  dashboard: {
    getStats: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) {
        console.warn("Stats RPC error or not found", error);
        return { totalStreams: "0", revenue: "$0.00", activeReleases: "0" };
      }
      return data;
    },

    getChartData: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('analytics_monthly')
        .select('*')
        .eq('uid', userId)
        .order('month', { ascending: true });
      if (error) throw error;
      return data;
    },

    getRecentReleases: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .eq('uid', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Release[];
    }
  },

  dsps: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('dsp_channels')
        .select('*')
        .eq('is_enabled', true)
        .order('name', { ascending: true });

      if (error) throw error;

      return data.map(d => ({
        id: d.id,
        name: d.name,
        code: d.code,
        logoUrl: d.logo_url,
        isEnabled: d.is_enabled
      })) as DspChannel[];
    }
  },

  catalog: {
    getReleases: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .eq('uid', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // UPDATED: Map DB snake_case to TS camelCase including new SoundOn fields
      return data.map(r => ({
        ...r,
        labelId: r.label_id,
        releaseDate: r.release_date,
        originalReleaseDate: r.original_release_date,
        coverArt: r.cover_art,
        copyrightYear: r.copyright_year,
        copyrightLine: r.copyright_line,
        phonogramYear: r.phonogram_year,
        phonogramLine: r.phonogram_line,
        selectedDsps: r.selected_dsps,
        // New Fields
        genre: r.genre,
        subGenre: r.sub_genre,
        language: r.language,
        format: r.format,
        territories: r.territories
      })) as Release[];
    },

    save: async (release: any) => { // using any to accept new fields before types.ts update
      const userId = await getUserId();

      // UPDATED: Transform TS camelCase to DB snake_case for new fields
      const payload = {
        title: release.title,
        version: release.version,
        label_id: release.labelId || null,
        release_date: release.releaseDate,
        original_release_date: release.originalReleaseDate,
        upc: release.upc,
        cover_art: release.coverArt,
        copyright_year: release.copyrightYear,
        copyright_line: release.copyrightLine,
        phonogram_year: release.phonogramYear,
        phonogram_line: release.phonogramLine,
        status: release.status,
        selected_dsps: release.selectedDsps || [],
        // New SoundOn Fields
        genre: release.genre,
        sub_genre: release.subGenre, // subGenre -> sub_genre
        language: release.language,
        format: release.format,
        territories: release.territories,

        uid: userId
      };

      let result;
      if (release.id) {
        result = await supabase
          .from('releases')
          .update(payload)
          .eq('id', release.id)
          .eq('uid', userId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('releases')
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      return result.data;
    },

    deleteRelease: async (id: number) => {
      const userId = await getUserId();
      const { error } = await supabase
        .from('releases')
        .delete()
        .eq('id', id)
        .eq('uid', userId);

      if (error) throw error;
      return { success: true };
    },

    requestTakedown: async (id: number) => {
      const userId = await getUserId();
      const { error } = await supabase
        .from('releases')
        .update({ status: 'TAKENDOWN' })
        .eq('id', id)
        .eq('uid', userId);

      if (error) throw error;
      return { success: true };
    }
  },

  artists: {
    getAll: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('uid', userId)
        .order('name', { ascending: true });

      if (error) throw error;

      return data.map(a => ({
        id: a.id,
        name: a.name,
        legalName: a.legal_name,
        email: a.email,
        avatar: a.avatar,
        spotifyId: a.spotify_id,
        appleMusicId: a.apple_music_id,
        soundcloudId: a.soundcloud_id,
        address: a.address
      })) as Artist[];
    },

    save: async (artist: Partial<Artist>) => {
      const userId = await getUserId();

      const payload = {
        name: artist.name,
        legal_name: artist.legalName,
        email: artist.email,
        avatar: artist.avatar,
        spotify_id: artist.spotifyId,
        apple_music_id: artist.appleMusicId,
        soundcloud_id: artist.soundcloudId,
        address: artist.address,
        uid: userId
      };

      let result;
      if (artist.id) {
        result = await supabase
          .from('artists')
          .update(payload)
          .eq('id', artist.id)
          .eq('uid', userId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('artists')
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      return result.data as Artist;
    },

    delete: async (id: number) => {
      const userId = await getUserId();
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', id)
        .eq('uid', userId);

      if (error) throw error;
      return { success: true };
    }
  },

  labels: {
    getAll: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('uid', userId);

      if (error) throw error;
      return data as Label[];
    },

    save: async (label: Partial<Label>) => {
      const userId = await getUserId();
      const payload = { ...label, uid: userId };

      if (label.id) {
        const { error } = await supabase
          .from('labels')
          .update(payload)
          .eq('id', label.id)
          .eq('uid', userId);
        if (error) throw error;
      } else {
        const { id, ...insertData } = payload;
        const { error } = await supabase.from('labels').insert(insertData);
        if (error) throw error;
      }
      return { success: true };
    },

    delete: async (id: number) => {
      const userId = await getUserId();
      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', id)
        .eq('uid', userId);
      if (error) throw error;
      return { success: true };
    }
  },

  tracks: {
    getAll: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('uid', userId);

      if (error) throw error;

      // UPDATED: Manually map fields to ensure camelCase for frontend
      return data.map((t: any) => ({
        id: t.id,
        releaseId: t.release_id,
        isrc: t.isrc,
        name: t.name,
        version: t.version,
        duration: t.duration,
        status: t.status,
        audioUrl: t.audio_url,
        filename: t.filename,
        hasLyrics: t.has_lyrics,
        lyricsLanguage: t.lyrics_language,
        lyricsText: t.lyrics_text,
        isExplicit: t.is_explicit,
        hasExplicitVersion: t.has_explicit_version,
        tiktokClipStartTime: t.tiktok_clip_start_time,
      })) as Track[];
    },

    save: async (track: any) => { // Using any to allow new field
      const userId = await getUserId();

      // UPDATED: Manual payload construction to handle snake_case conversion
      const payload = {
        id: track.id, // If present
        release_id: track.releaseId,
        isrc: track.isrc,
        name: track.name,
        version: track.version,
        duration: track.duration,
        status: track.status,
        audio_url: track.audioUrl,
        filename: track.filename,
        has_lyrics: track.hasLyrics,
        lyrics_language: track.lyricsLanguage,
        lyrics_text: track.lyricsText,
        is_explicit: track.isExplicit,
        has_explicit_version: track.hasExplicitVersion,
        // NEW: Map TikTok clip time
        tiktok_clip_start_time: track.tiktokClipStartTime,
        uid: userId
      };

      const { data, error } = await supabase
        .from('tracks')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      // We return the raw data, but re-mapped might be safer for immediate UI updates
      return {
        ...data,
        tiktokClipStartTime: data.tiktok_clip_start_time
      } as unknown as Track;
    }
  },

  wallet: {
    getSummary: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('wallet_summary')
        .select('*')
        .eq('uid', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { availableBalance: 0, pendingClearance: 0, lifetimeEarnings: 0 };
    },

    getTransactions: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('uid', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },

    getPayoutMethods: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('payout_methods')
        .select('*')
        .eq('uid', userId);
      if (error) throw error;
      return data as PayoutMethod[];
    },

    savePayoutMethod: async (pm: Partial<PayoutMethod>) => {
      const userId = await getUserId();
      const payload = { ...pm, uid: userId };

      const { data, error } = await supabase
        .from('payout_methods')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as PayoutMethod;
    },

    deletePayoutMethod: async (id: string) => {
      const userId = await getUserId();
      const { error } = await supabase
        .from('payout_methods')
        .delete()
        .eq('id', id)
        .eq('uid', userId);
      if (error) throw error;
      return { success: true };
    },

    requestWithdrawal: async (amount: number, methodId: string) => {
      const userId = await getUserId();

      const { error: txError } = await supabase.from('transactions').insert({
        amount: amount,
        type: 'WITHDRAWAL',
        status: 'PENDING',
        date: new Date().toISOString(),
        uid: userId
      });
      if (txError) throw txError;

      await supabase.from('action_logs').insert({
        action: 'WITHDRAWAL_REQUEST',
        details: `Requested $${amount} via ${methodId}`,
        uid: userId
      });

      return { success: true };
    }
  },

  support: {
    getTickets: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, messages:ticket_messages(*)')
        .eq('uid', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },

    createTicket: async (data: Partial<SupportTicket>) => {
      const userId = await getUserId();

      const { data: ticket, error: tError } = await supabase
        .from('support_tickets')
        .insert({
          subject: data.subject,
          category: data.category,
          priority: data.priority,
          status: 'OPEN',
          uid: userId
        })
        .select()
        .single();

      if (tError) throw tError;

      if (data.messages && data.messages.length > 0) {
        await api.support.addMessage(ticket.id, data.messages[0].content);
      }

      return ticket;
    },

    addMessage: async (ticketId: string, content: string) => {
      const userId = await getUserId();

      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        content: content,
        sender_id: userId,
        role: 'USER',
        uid: userId
      });

      if (error) throw error;

      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString(), status: 'OPEN' })
        .eq('id', ticketId)
        .eq('uid', userId);

      const { data: updatedTicket } = await supabase
        .from('support_tickets')
        .select('*, messages:ticket_messages(*)')
        .eq('id', ticketId)
        .single();

      return updatedTicket;
    }
  }
};