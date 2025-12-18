
import { MOCK_RELEASES, MOCK_LABELS, MOCK_TRACKS, DASHBOARD_STATS, DASHBOARD_CHART_DATA, WALLET_SUMMARY, MOCK_TRANSACTIONS, MOCK_TICKETS } from '../constants';
import { Release, Transaction, ActionLog, Label, Track, PayoutMethod, UserProfile, SupportTicket } from '../types';

/**
 * PRODUCTION ARCHITECTURE NOTE:
 * For Supabase: Replace local state logic with `supabase.from('table').select()`
 * For Cloudflare R2: Use the `getPresignedUrl` pattern for direct-to-bucket uploads.
 */

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Simulated State for R2 & Database
let auditLogs: ActionLog[] = [];
let labels = [...MOCK_LABELS];
let tracks = [...MOCK_TRACKS];
let tickets = [...MOCK_TICKETS];
let userProfile: UserProfile = {
  id: 1,
  name: 'Unknown Brain',
  email: 'contact@unknownbrain.com',
  role: 'Artist Account',
};
let payoutMethods: PayoutMethod[] = [
  { id: 'pm_1', type: 'BANK', name: 'Primary Bank', details: 'Chase (...4421)', accountHolder: 'Maikel S. Brain' }
];

export const api = {
  auth: {
    login: async (email: string, pass: string) => {
      await delay(800);
      if (email === 'demo@aurora.com' && pass === 'demo') {
        return { token: 'JWT_AURORA_PROD', user: userProfile };
      }
      throw new Error('Unauthorized');
    },
    getProfile: async () => userProfile,
    updateProfile: async (data: Partial<UserProfile>) => {
      await delay(600);
      userProfile = { ...userProfile, ...data };
      return userProfile;
    }
  },

  storage: {
    getPresignedUrl: async (filename: string, contentType: string) => {
      await delay(300);
      return {
        uploadUrl: `https://aurora-assets.r2.cloudflarestorage.com/signed-upload-path/${filename}`,
        publicUrl: `https://pub-assets.auroramusic.net/${filename}`
      };
    },
    upload: async (file: File) => {
      await delay(1500);
      return `https://pub-assets.auroramusic.net/simulated_path/${file.name}`;
    }
  },

  dashboard: {
    getStats: async () => DASHBOARD_STATS,
    getChartData: async () => DASHBOARD_CHART_DATA,
    getRecentReleases: async () => MOCK_RELEASES.slice(0, 5)
  },

  catalog: {
    getReleases: async () => MOCK_RELEASES,
    deleteRelease: async (id: number) => { 
      await delay(500); 
      return { success: true }; 
    },
    requestTakedown: async (id: number) => { 
      await delay(800); 
      return { success: true }; 
    }
  },

  labels: {
    getAll: async () => labels,
    save: async (label: Partial<Label>) => {
      await delay(500);
      if (label.id) labels = labels.map(l => l.id === label.id ? { ...l, ...label } as Label : l);
      else labels.push({ ...label, id: Date.now() } as Label);
      return { success: true };
    },
    delete: async (id: number) => {
      await delay(600);
      labels = labels.filter(l => l.id !== id);
      return { success: true };
    }
  },

  tracks: {
    getAll: async () => tracks,
    save: async (track: Track) => {
      await delay(700);
      const idx = tracks.findIndex(t => t.id === track.id);
      if (idx >= 0) tracks[idx] = track;
      else tracks.unshift(track);
      return track;
    }
  },

  wallet: {
    getSummary: async () => WALLET_SUMMARY,
    getTransactions: async () => MOCK_TRANSACTIONS,
    getPayoutMethods: async () => payoutMethods,
    savePayoutMethod: async (pm: Partial<PayoutMethod>) => {
      await delay(400);
      const newPm = { ...pm, id: pm.id || `pm_${Date.now()}` } as PayoutMethod;
      if (pm.id) payoutMethods = payoutMethods.map(p => p.id === pm.id ? newPm : p);
      else payoutMethods.push(newPm);
      return newPm;
    },
    deletePayoutMethod: async (id: string) => {
      await delay(400);
      payoutMethods = payoutMethods.filter(p => p.id !== id);
      return { success: true };
    },
    requestWithdrawal: async (amount: number, methodId: string) => {
      await delay(1200);
      const method = payoutMethods.find(p => p.id === methodId);
      auditLogs.push({
        id: `TX-${Date.now()}`,
        action: 'WITHDRAWAL_REQUEST',
        timestamp: new Date().toISOString(),
        status: 'PENDING_REVIEW',
        performedBy: userProfile.name,
        details: `Disbursement of $${amount} to ${method?.name}`
      });
      return { success: true };
    }
  },

  support: {
    getTickets: async () => {
      await delay(400);
      return tickets;
    },
    createTicket: async (data: Partial<SupportTicket>) => {
      await delay(800);
      const newTicket: SupportTicket = {
        id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
        subject: data.subject || 'Untitled',
        category: data.category || 'OTHER',
        status: 'OPEN',
        priority: data.priority || 'MEDIUM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [{
          id: `msg-${Date.now()}`,
          senderName: userProfile.name,
          role: 'USER',
          content: data.messages?.[0]?.content || '',
          timestamp: new Date().toISOString()
        }]
      };
      tickets = [newTicket, ...tickets];
      return newTicket;
    },
    addMessage: async (ticketId: string, content: string) => {
      await delay(500);
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        ticket.messages.push({
          id: `msg-${Date.now()}`,
          senderName: userProfile.name,
          role: 'USER',
          content,
          timestamp: new Date().toISOString()
        });
        ticket.updatedAt = new Date().toISOString();
        ticket.status = 'OPEN'; // Re-open if closed
      }
      return ticket;
    }
  }
};
