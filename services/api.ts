import { createClient } from '@supabase/supabase-js';
import { Release, Track, Label, PayoutMethod, UserProfile, SupportTicket, Transaction, Artist, DspChannel } from '../types';

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase Environment Variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    window.dispatchEvent(new Event('force-logout'));
    throw new Error("User not authenticated. Session invalid.");
  }
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
    loginWithGoogle: async () => {
      // Lấy URL hiện tại để redirect về sau khi đăng nhập thành công
      const redirectTo = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return data;
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
    },
    updatePassword: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { success: true };
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
    },
    delete: async (fileUrl: string) => {
      try {
        if (!fileUrl) return;
        const urlObj = new URL(fileUrl);
        const key = urlObj.pathname.substring(1);
        const { error } = await supabase.functions.invoke('file-delete', {
          body: { key }
        });
        if (error) throw error;
        console.log("Deleted file from R2:", key);
      } catch (err) {
        console.error("Failed to delete file:", err);
      }
    }
  },

  dashboard: {
    // 1. Lấy chỉ số tổng quan (Gọi RPC mới)
    getStats: async () => {
      const { data, error } = await supabase.rpc('get_user_overview_stats');

      if (error) {
        console.error("Stats Error:", error);
        return { totalStreams: 0, revenue: 0, activeReleases: 0, monthlyListeners: 0 };
      }

      // Format dữ liệu cho đẹp
      return {
        totalStreams: data.totalStreams.toLocaleString(),
        // Giả lập % thay đổi (Vì logic tính % phức tạp, tạm thời hardcode hoặc tính sau)
        totalStreamsChange: "+0%",
        revenue: `$${(data.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        revenueChange: "+0%",
        activeReleases: data.activeReleases.toString(),
        monthlyListeners: data.monthlyListeners.toLocaleString(),
        monthlyListenersChange: "+0%"
      };
    },

    // 2. Lấy dữ liệu biểu đồ (Gọi RPC mới)
    getChartData: async () => {
      const { data, error } = await supabase.rpc('get_user_stream_chart', { p_months: 12 });

      if (error) {
        console.error("Chart Error:", error);
        return [];
      }
      return data; // Trả về mảng [{ name: 'Jan', streams: 100 }, ...]
    },

    // 3. Lấy Release gần đây (Giữ nguyên logic cũ vì bảng releases không đổi)
    getRecentReleases: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .eq('uid', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Map snake_case -> camelCase
      return data.map((r: any) => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        status: r.status,
        coverArt: r.cover_art,
        releaseDate: r.release_date,
        version: r.version
      })) as Release[];
    },
    getPlatformStats: async () => {
      const { data, error } = await supabase.rpc('get_analytics_by_platform', { p_days: 30 });
      if (error) {
        console.error(error);
        return [];
      }
      return data; // [{ name: 'Spotify', value: 1000 }, ...]
    },

    // [MỚI] Lấy dữ liệu biểu đồ cột (Daily Trend)
    getDailyTrend: async () => {
      const { data, error } = await supabase.rpc('get_analytics_daily_trend', { p_days: 7 });
      if (error) {
        console.error(error);
        return [];
      }
      return data; // [{ day: 'Mon', streams: 50 }, ...]
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
        territories: r.territories,
        rejectionReason: r.rejection_reason
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
        artists: t.artists || [],
        contributors: t.contributors || []
      })) as Track[];
    },

    getByReleaseId: async (releaseId: number) => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('release_id', releaseId)
        .order('id', { ascending: true }); // Optional: order by ID or track number

      if (error) throw error;

      // reuse the mapping logic to ensure camelCase matches your frontend types
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
        artists: t.artists || [],
        contributors: t.contributors || []
      })) as Track[];
    },

    save: async (track: any) => {
      const userId = await getUserId();

      const payload = {
        id: track.id,
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
        tiktok_clip_start_time: track.tiktokClipStartTime,
        artists: track.artists,
        contributors: track.contributors,

        uid: userId
      };

      const { data, error } = await supabase
        .from('tracks')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        tiktokClipStartTime: data.tiktok_clip_start_time,
        // Map lại để frontend dùng ngay lập tức
        artists: data.artists,
        contributors: data.contributors
      } as unknown as Track;
    },
    delete: async (id: number) => {
      const userId = await getUserId();
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', id)
        .eq('uid', userId);

      if (error) throw error;
      return { success: true };
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
  },

  admin: {
    // 1. Lấy toàn bộ Releases (cho trang Moderation)
    getAllReleases: async (statusFilter?: string) => {
      let query = supabase
        .from('releases')
        .select('*, profiles(email, name)') // Join bảng profiles để biết ai upload
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((r: any) => ({
        ...r,
        coverArt: r.cover_art,        // Fix ảnh bìa
        releaseDate: r.release_date,  // Fix ngày tháng
        labelId: r.label_id,
        // Giữ lại các trường khác
      }));
    },

    getPendingWithdrawals: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, profiles(email, name, legal_name)')
        .eq('type', 'WITHDRAWAL')
        .eq('status', 'PENDING')
        .order('date', { ascending: true }); // Cũ nhất lên đầu

      if (error) throw error;
      return data;
    },

    // 9. Xử lý rút tiền (Duyệt/Từ chối)
    processWithdrawal: async (txnId: string, status: 'COMPLETED' | 'REJECTED', note?: string) => {
      const { error } = await supabase.rpc('admin_process_withdrawal', {
        p_txn_id: txnId,
        p_status: status,
        p_note: note || null
      });

      if (error) throw error;
      return { success: true };
    },

    // 2. Lấy chi tiết Release kèm Tracks (Admin View)
    getReleaseDetail: async (id: number) => {
      const { data, error } = await supabase
        .from('releases')
        .select('*, tracks(*), profiles(email, name, legal_name), labels(id, name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        coverArt: data.cover_art,       // [FIX QUAN TRỌNG]
        releaseDate: data.release_date,
        labelId: data.label_id,
        selectedDsps: data.selected_dsps || [],
        labelName: data.labels ? data.labels.name : 'Independent',
        // Map mảng tracks bên trong
        tracks: data.tracks.map((t: any) => ({
          ...t,
          audioUrl: t.audio_url,      // [FIX QUAN TRỌNG] Load Audio
          releaseId: t.release_id,
          isrc: t.isrc,
          // Các trường artist/contributors thường lưu dạng JSONB nên không bị ảnh hưởng, 
          // nhưng nếu cần thiết hãy check kỹ structure JSON
        }))
      };
    },

    // 3. Hành động Moderation: Cập nhật UPC/Status
    updateReleaseMetadata: async (id: number, updates: {
      upc?: string,
      status?: string,
      rejection_reason?: string
    }) => {
      // Khi update ngược lại DB, ta dùng snake_case (nếu cần) hoặc object mapping
      // Tuy nhiên Supabase JS client đủ thông minh để map nếu key khớp column.
      // Nhưng để chắc ăn, ta map thủ công payload update nếu tên khác nhau.
      // Ở đây upc và status trùng tên nên ok.
      const { data, error } = await supabase
        .from('releases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // 4. Hành động Tracks: Cập nhật ISRC
    updateTrackISRC: async (trackId: number, isrc: string) => {
      const { error } = await supabase
        .from('tracks')
        .update({ isrc: isrc })
        .eq('id', trackId);

      if (error) throw error;
      return { success: true };
    },

    // 5. User Management: Lấy danh sách user
    getUsers: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },

    // 6. User Management: Xóa user (Admin only)
    deleteUser: async (userId: string) => {
      // Lưu ý: Client-side chỉ xóa được profile. 
      // Để xóa hoàn toàn trong Auth, cần dùng Edge Function (sẽ làm ở bước sau).
      // Tạm thời ta xóa profile để "soft ban".
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (error) throw error;
    },
    getUserProfileFull: async (userId: string) => {
      // 1. Lấy Profile + Wallet
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*, wallet_summary(*)')
        .eq('id', userId)
        .single();

      if (pError) throw pError;

      // 2. Lấy danh sách Releases của User này
      const { data: releases, error: rError } = await supabase
        .from('releases')
        .select('*')
        .eq('uid', userId)
        .order('created_at', { ascending: false });

      if (rError) throw rError;

      return {
        ...profile,
        wallet: profile.wallet_summary, // Map lại cho gọn
        releases: releases.map((r: any) => ({
          ...r,
          coverArt: r.cover_art, // Map snake_case
          releaseDate: r.release_date
        }))
      };
    },
    getAllDSPs: async () => {
      const { data, error } = await supabase
        .from('dsp_channels')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return data;
    },

    saveDSP: async (dsp: Partial<DspChannel>) => {
      const payload = {
        name: dsp.name,
        code: dsp.code,
        logo_url: dsp.logoUrl,
        is_enabled: dsp.isEnabled
      };

      let query;
      if (dsp.id) {
        query = supabase.from('dsp_channels').update(payload).eq('id', dsp.id);
      } else {
        query = supabase.from('dsp_channels').insert(payload);
      }

      const { error } = await query;
      if (error) throw error;
    },

    toggleDSPStatus: async (id: number, isEnabled: boolean) => {
      const { error } = await supabase
        .from('dsp_channels')
        .update({ is_enabled: isEnabled })
        .eq('id', id);
      if (error) throw error;
    },
    getAllTickets: async () => {
      // Join bảng profiles để biết ai gửi
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, profiles(name, email, avatar), messages:ticket_messages(*)')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },

    replyTicket: async (ticketId: string, content: string) => {
      const userId = await getUserId();
      
      // 1. Insert tin nhắn vai trò ADMIN
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        content: content,
        sender_id: userId,
        role: 'ADMIN',
        uid: userId
      });

      if (error) throw error;

      // 2. Update timestamp cho ticket để nó nổi lên đầu
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString(), status: 'IN_PROGRESS' }) // Tự động chuyển sang đang xử lý
        .eq('id', ticketId);

      // 3. Trả về dữ liệu mới nhất của ticket đó để update UI
      return api.admin.getTicketDetail(ticketId);
    },

    updateTicketStatus: async (ticketId: string, status: string) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      
      if (error) throw error;
    },

    getTicketDetail: async (ticketId: string) => {
        const { data, error } = await supabase
        .from('support_tickets')
        .select('*, profiles(name, email, avatar), messages:ticket_messages(*)')
        .eq('id', ticketId)
        .single();
        
        if (error) throw error;
        return data;
    }
  }
};