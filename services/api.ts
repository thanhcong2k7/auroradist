import { createClient } from '@supabase/supabase-js';
import { Release, Track, Label, PayoutMethod, UserProfile, SupportTicket, Transaction, Artist, DspChannel } from '../types';
import { APIError } from './utils';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase Environment Variables");
}
export const supabase = createClient(supabaseUrl, supabaseKey);
const handleError = (error: any) => {
  console.error("API Error:", error);
  throw new Error(error.message || "An unexpected error occurred");
};
const getUserId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    window.dispatchEvent(new Event('force-logout'));
    throw new Error("User not authenticated. Session invalid.");
  }
  return user.id;
};
export const api = {
  auth: {
    login: async (email: string, pass: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) throw error;
      const profile = await api.auth.getProfile();
      if (profile.status === "SUSPEND") {
        window.dispatchEvent(new Event('force-logout'));
        throw new APIError("User has been suspended", 401);
      }
      return { token: data.session.access_token, user: profile };
    },
    loginWithGoogle: async () => {
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
      const profile = await api.auth.getProfile();
      if (profile.status === "SUSPEND") {
        window.dispatchEvent(new Event('force-logout'));
        throw new APIError("User has been suspended", 401);
      }
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
      if (data.status === "SUSPEND") {
        window.dispatchEvent(new Event('force-logout'));
        alert("User has been suspended. Reach out to support team for more info.");
        throw new APIError("User has been suspended", 401);
      }
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
        /*
        const { data: signData, error: signError } = await supabase.functions.invoke('upload-signer', {
          body: {
            filename: file.name,
            fileType: file.type
          }
        });
        */
        const response = await fetch(
          `${supabaseUrl}/functions/v1/upload-signer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              filename: file.name,
              fileType: file.type
            }),
          }
        );
        const signData = await response.json();
        //if (signError) throw signError;

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
    getPlatformStats: async (startDate: string, endDate: string) => {
      const { data, error } = await supabase.rpc('get_analytics_by_platform', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) {
        console.error("Platform Stats Error:", error);
        return [];
      }
      return data;
    },
    getDailyTrend: async (startDate: string, endDate: string) => {
      const { data, error } = await supabase.rpc('get_analytics_daily_trend', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) {
        console.error("Daily Trend Error:", error);
        return [];
      }
      return data;
    },
    getAnalyticsTrend: async (startDate: string, endDate: string) => {
      const userId = await getUserId();
      const { data, error } = await supabase.rpc('get_artist_analytics_v3', {
        p_uid: userId,
        p_start_date: startDate,
        p_end_date: endDate
      });
      if (error) throw error;
      return data;
    },
    getPlatformDistribution: async (startDate: string, endDate: string) => {
      const userId = await getUserId();
      const { data, error } = await supabase.rpc('get_platform_stats_v3', {
        p_uid: userId,
        p_start_date: startDate,
        p_end_date: endDate
      });
      if (error) throw error;
      return data;
    },
    getMyRate: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('profiles')
        .select('contract_rate')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data?.contract_rate || 0.8;
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
    getReleases: async (page: number = 1, limit: number = 100000) => {
      const userId = await getUserId();

      // Tính toán range cho Supabase
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .eq('uid', userId)
        .order('created_at', { ascending: false })
        .range(from, to); // Thêm dòng này để chỉ lấy số lượng cần thiết

      if (error) throw error;

      // Mapping giữ nguyên như code của bạn
      return data.map(r => ({
        ...r,
        labelId: r.label_id,
        releaseDate: r.release_date,
        originalReleaseDate: r.original_release_date,
        coverArt: r.cover_art, // Lưu ý: Dashboard cần dùng key 'coverArt' này
        copyrightYear: r.copyright_year,
        copyrightLine: r.copyright_line,
        phonogramYear: r.phonogram_year,
        phonogramLine: r.phonogram_line,
        selectedDsps: r.selected_dsps,
        genre: r.genre,
        subGenre: r.sub_genre,
        language: r.language,
        format: r.format,
        territories: r.territories,
        rejectionReason: r.rejection_reason
      })) as Release[];
    },

    createDraft: async () => {
      const userId = await getUserId();

      const { data, error } = await supabase
        .from('releases')
        .insert({
          title: 'Untitled Release', // Tên mặc định
          status: 'DRAFT',
          uid: userId,
          // Các trường khác để null hoặc default theo DB
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    save: async (release: any) => {
      const userId = await getUserId();

      // [FIX] Convert empty string to null for Dates
      const releaseDate = release.releaseDate ? release.releaseDate : null;
      const originalReleaseDate = release.originalReleaseDate ? release.originalReleaseDate : null;

      const payload = {
        title: release.title,
        version: release.version,
        label_id: release.labelId || null,
        release_date: releaseDate, // Đã fix
        original_release_date: originalReleaseDate, // Đã fix
        upc: release.upc,
        cover_art: release.coverArt,
        copyright_year: release.copyrightYear,
        copyright_line: release.copyrightLine,
        phonogram_year: release.phonogramYear,
        phonogram_line: release.phonogramLine,
        status: release.status,
        selected_dsps: release.selectedDsps || [],
        genre: release.genre,
        sub_genre: release.subGenre,
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
        // Fallback (ít khi dùng nếu đã tạo draft trước)
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
    },
    getSplits: async (releaseId: number) => {
      const { data, error } = await supabase
        .from('revenue_splits')
        .select('*, profiles(email, name)') // Join để hiện tên người nhận
        .eq('release_id', releaseId);
      if (error) throw error;
      return data;
    },

    // Thêm người chia tiền (Dựa vào Email)
    addSplit: async (releaseId: number, email: string, percentage: number) => {
      // 1. Tìm User ID từ Email
      const { data: user, error: uError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (uError || !user) throw new Error("User email not found in system.");

      // 2. Thêm vào bảng Split
      const { error } = await supabase.from('revenue_splits').insert({
        release_id: releaseId,
        recipient_uid: user.id,
        percentage: percentage
      });

      if (error) throw error;
    },

    // Xóa split
    deleteSplit: async (splitId: number) => {
      const { error } = await supabase.from('revenue_splits').delete().eq('id', splitId);
      if (error) throw error;
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

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 là lỗi không tìm thấy dòng nào
      if (!data) return { availableBalance: 0, pendingClearance: 0, lifetimeEarnings: 0 };

      // [FIX QUAN TRỌNG] Map từ snake_case (DB) sang camelCase (Frontend)
      return {
        availableBalance: data.available_balance,     // DB: available_balance -> FE: availableBalance
        pendingClearance: data.pending_clearance,     // DB: pending_clearance -> FE: pendingClearance
        lifetimeEarnings: data.lifetime_earnings      // DB: lifetime_earnings -> FE: lifetimeEarnings
      };
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
      const { data, error } = await supabase.rpc('user_request_withdrawal', {
        p_amount: amount,
        p_method_id: methodId
      });

      if (error) {
        console.error("Withdrawal RPC Error:", error);
        throw new Error(error.message || "Failed to process withdrawal request.");
      }

      return { success: true, data };
    },
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
    getAllReleases: async (statusFilter?: string) => {
      let query = supabase
        .from('releases')
        .select('*, profiles(email, name)')
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

    getLabels: async () => {
      // 1. Fetch labels without join
      const { data: labels, error: labelsError } = await supabase
        .from('labels')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (labelsError) throw labelsError;

      // 2. Extract UIDs
      const userIds = Array.from(new Set(labels.map((l: any) => l.uid).filter((uid: any) => uid)));

      if (userIds.length === 0) return labels;

      // 3. Fetch profiles manually
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name, legal_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // 4. Map profiles to labels
      const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

      return labels.map((l: any) => ({
        ...l,
        profiles: profileMap.get(l.uid) || null
      }));
    },

    deleteLabel: async (id: number) => {
        const { error } = await supabase
            .from('labels')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    },

    // 9. Xử lý rút tiền (Duyệt/Từ chối)
    processWithdrawal: async (txnId: string, status: 'COMPLETED' | 'REJECTED', note?: string) => {
      const { data, error } = await supabase.rpc('admin_process_withdrawal', {
        p_txn_id: txnId,
        p_status: status,
        p_note: note || null
      });

      if (error) {
        console.error("Admin Process Withdrawal Error:", error);
        throw new Error(error.message || "Failed to update withdrawal status.");
      }

      return { success: true, data };
    },

    // 2. Lấy chi tiết Release kèm Tracks (Admin View)
    getReleaseDetail: async (id: number) => {
      const { data, error } = await supabase
        .from('releases')
        .select('*, tracks(*), profiles(email, name, legal_name), labels(id, name)')
        .eq('id', id)
        .single();

      if (error) throw error;

      // [UPDATE] Fetch artist IDs for clickable popup
      const artistNames = new Set<string>();
      data.tracks.forEach((t: any) => {
        if (Array.isArray(t.artists)) {
          t.artists.forEach((a: any) => {
            if (a.name) artistNames.add(a.name);
          });
        }
      });

      const artistMap = new Map<string, number>();
      if (artistNames.size > 0 && data.uid) {
        const { data: artistsData } = await supabase
          .from('artists')
          .select('id, name')
          .eq('uid', data.uid)
          .in('name', Array.from(artistNames));
        
        if (artistsData) {
          artistsData.forEach((a: any) => artistMap.set(a.name, a.id));
        }
      }

      return {
        ...data,
        coverArt: data.cover_art,
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
          artists: Array.isArray(t.artists) ? t.artists.map((a: any) => ({
            ...a,
            id: artistMap.get(a.name) || a.id 
          })) : [],
          contributors: t.contributors || []
        }))
      };
    },

    // 3. Hành động Moderation: Cập nhật UPC/Status
    updateReleaseMetadata: async (id: number, updates: {
      upc?: string,
      status?: string,
      rejection_reason?: string
    }) => {
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
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (error) throw error;
    },
    suspendUser: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'SUSPEND' })
        .eq('id', userId);
      if (error) throw error;
    },
    activateUser: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'ACTIVE' })
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
    },
    moderateRelease: async (
      releaseId: number,
      action: 'APPROVE' | 'REJECT',
      payload: { upc?: string, isrcs?: { id: number, isrc: string }[], reason?: string }
    ) => {
      const { data, error } = await supabase.functions.invoke('admin-moderate-release', {
        body: {
          action,
          releaseId,
          payload
        }
      });

      if (error) {
        console.error("Moderation Error:", error);
        throw new Error(error.message || "Failed to process moderation.");
      }

      // Nếu function trả về lỗi logic
      if (data && data.error) {
        throw new Error(data.error);
      }

      return { success: true };
    },
    ingestRawAnalytics: async (payload: any[]) => {
      // Chia nhỏ batch nếu quá lớn (ví dụ > 5000 dòng)
      const { error } = await supabase
        .from('raw_analytics')
        .insert(payload);
      if (error) throw error;
      return { success: true };
    },
    getArtistDetail: async (artistId: number) => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        legalName: data.legal_name,
        email: data.email,
        avatar: data.avatar,
        spotifyId: data.spotify_id,
        appleMusicId: data.apple_music_id,
        soundcloudId: data.soundcloud_id,
        address: data.address
      } as Artist;
    },
    updateArtistRate: async (userId: string, newRate: number) => {
      // newRate nên là số thập phân, ví dụ 0.85 (85%)
      const { error } = await supabase
        .from('profiles')
        .update({ contract_rate: newRate })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    }
  }
};