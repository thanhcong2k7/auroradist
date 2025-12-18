import { createClient } from '@supabase/supabase-js';
import { Release, Track, Label, PayoutMethod, UserProfile, SupportTicket, Transaction } from '../types';

// Initialize Supabase
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase Environment Variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to map DB snake_case to TS camelCase if your DB uses snake_case
// In a real scenario, it is better to define Database types matching the DB exactly.
const handleError = (error: any) => {
  console.error("API Error:", error);
  throw new Error(error.message || "An unexpected error occurred");
};

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No session");

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },

    updateProfile: async (updates: Partial<UserProfile>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No session");

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    }
  },

  storage: {
    /**
     * Uploads a file to Cloudflare R2 via Supabase Edge Function
     */
    upload: async (file: File): Promise<string> => {
      try {
        // 1. Get Presigned URL from Backend
        const { data: signData, error: signError } = await supabase.functions.invoke('upload-signer', {
          body: {
            filename: file.name,
            fileType: file.type
          }
        });

        if (signError) throw signError;

        // 2. Upload directly to R2 using the presigned URL
        const uploadResponse = await fetch(signData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload asset to storage node.');
        }

        // 3. Return the public URL for the DB
        return signData.publicUrl;
      } catch (err) {
        handleError(err);
        return "";
      }
    }
  },

  dashboard: {
    // Best practice: Use a Postgres RPC (function) for complex aggregations
    getStats: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) {
        console.warn("Stats RPC not found, falling back to mock or simple count");
        return { totalStreams: "0", revenue: "$0.00", activeReleases: "0" };
      }
      return data;
    },

    getChartData: async () => {
      const { data, error } = await supabase.from('analytics_monthly').select('*').order('month', { ascending: true });
      if (error) throw error;
      return data;
    },

    getRecentReleases: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Release[];
    }
  },

  catalog: {
    getReleases: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Release[];
    },

    deleteRelease: async (id: number) => {
      const { error } = await supabase.from('releases').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    requestTakedown: async (id: number) => {
      const { error } = await supabase
        .from('releases')
        .update({ status: 'TAKENDOWN' }) // Or 'PENDING_TAKEDOWN'
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    }
  },

  labels: {
    getAll: async () => {
      const { data, error } = await supabase.from('labels').select('*');
      if (error) throw error;
      return data as Label[];
    },

    save: async (label: Partial<Label>) => {
      if (label.id) {
        const { error } = await supabase.from('labels').update(label).eq('id', label.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('labels').insert(label);
        if (error) throw error;
      }
      return { success: true };
    },

    delete: async (id: number) => {
      const { error } = await supabase.from('labels').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    }
  },

  tracks: {
    getAll: async () => {
      // Assuming simple structure. For relations, use .select('*, artists:track_artists(*)')
      const { data, error } = await supabase.from('tracks').select('*');
      if (error) throw error;
      return data as Track[];
    },

    save: async (track: Track) => {
      // Upsert handles both Insert and Update based on ID
      const { data, error } = await supabase
        .from('tracks')
        .upsert(track)
        .select()
        .single();

      if (error) throw error;
      return data as Track;
    }
  },

  wallet: {
    getSummary: async () => {
      const { data, error } = await supabase.from('wallet_summary').select('*').single();
      // Handle empty state gracefully
      if (error && error.code !== 'PGRST116') throw error;
      return data || { availableBalance: 0, pendingClearance: 0, lifetimeEarnings: 0 };
    },

    getTransactions: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },

    getPayoutMethods: async () => {
      const { data, error } = await supabase.from('payout_methods').select('*');
      if (error) throw error;
      return data as PayoutMethod[];
    },

    savePayoutMethod: async (pm: Partial<PayoutMethod>) => {
      const { data, error } = await supabase
        .from('payout_methods')
        .upsert(pm)
        .select()
        .single();
      if (error) throw error;
      return data as PayoutMethod;
    },

    deletePayoutMethod: async (id: string) => {
      const { error } = await supabase.from('payout_methods').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    requestWithdrawal: async (amount: number, methodId: string) => {
      // 1. Create Transaction Record
      const { error: txError } = await supabase.from('transactions').insert({
        amount: amount,
        type: 'WITHDRAWAL',
        status: 'PENDING',
        date: new Date().toISOString()
      });
      if (txError) throw txError;

      // 2. Create Audit Log (Optional)
      await supabase.from('action_logs').insert({
        action: 'WITHDRAWAL_REQUEST',
        details: `Requested $${amount} via ${methodId}`
      });

      return { success: true };
    }
  },

  support: {
    getTickets: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, messages:ticket_messages(*)')
        .order('updatedAt', { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },

    createTicket: async (data: Partial<SupportTicket>) => {
      // 1. Create Ticket
      const { data: ticket, error: tError } = await supabase
        .from('support_tickets')
        .insert({
          subject: data.subject,
          category: data.category,
          priority: data.priority,
          status: 'OPEN'
        })
        .select()
        .single();

      if (tError) throw tError;

      // 2. Insert Initial Message
      if (data.messages && data.messages.length > 0) {
        await api.support.addMessage(ticket.id, data.messages[0].content);
      }

      return ticket;
    },

    addMessage: async (ticketId: string, content: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        content: content,
        sender_id: user?.id,
        role: 'USER'
      });

      if (error) throw error;

      // Update ticket timestamp
      await supabase
        .from('support_tickets')
        .update({ updatedAt: new Date().toISOString(), status: 'OPEN' })
        .eq('id', ticketId);

      // Return updated ticket structure
      const { data: updatedTicket } = await supabase
        .from('support_tickets')
        .select('*, messages:ticket_messages(*)')
        .eq('id', ticketId)
        .single();

      return updatedTicket;
    }
  }
};