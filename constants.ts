
import { Release, Artist, Track, Transaction, Label, SupportTicket } from './types';

export const MOCK_LABELS: Label[] = [
  { id: 1, name: 'Aurora Records', email: 'demo@aurora.com' },
  { id: 2, name: 'Future Bass Gen', email: 'subs@futurebass.gen' },
  { id: 3, name: 'NCS', email: 'demo@ncs.io' }
];

export const PERFORMER_ROLES = [
  'Vocals', 'Guitar', 'Bass Guitar', 'Drums', 'Keyboards', 'Piano', 'Synthesizer', 
  'Violin', 'Cello', 'Saxophone', 'Trumpet', 'Trombone', 'Flute', 'Background Vocals', 
  'Programming', 'Accordion', 'Banjo', 'Choir', 'Clarinet', 'Fiddle', 'Harmonica', 'Harp'
];

export const MOCK_RELEASES: Release[] = [
  {
    id: 485,
    upc: '198002345678',
    title: 'Neon Horizon',
    artist: 'Unknown Brain',
    labelId: 3,
    status: 'ACCEPTED',
    releaseDate: '2024-05-20',
    coverArt: 'https://picsum.photos/300/300?random=1',
    copyrightYear: '2024',
    copyrightLine: 'Unknown Brain',
    phonogramYear: '2024',
    phonogramLine: 'NCS'
  },
  {
    id: 486,
    upc: '198002345679',
    title: 'Cyberpunk Dreams',
    version: 'Remix',
    artist: 'Elektronomia',
    labelId: 3,
    status: 'CHECKING',
    releaseDate: '2024-06-01',
    coverArt: 'https://picsum.photos/300/300?random=2',
    copyrightYear: '2024',
    copyrightLine: 'Elektronomia',
    phonogramYear: '2024',
    phonogramLine: 'NCS'
  },
  {
    id: 487,
    upc: '',
    title: 'Void Echoes',
    artist: 'Thereon',
    labelId: 1,
    status: 'DRAFT',
    releaseDate: '',
    coverArt: '',
    copyrightYear: '2024',
    copyrightLine: 'Thereon',
    phonogramYear: '2024',
    phonogramLine: 'Thereon Music'
  }
];

export const MOCK_ARTISTS: Artist[] = [
  {
    id: 1,
    name: 'Unknown Brain',
    spotifyId: '3NtqIIwOmoUGkrS4iD4lxY',
    appleMusicId: '1726676105',
    email: 'contact@unknownbrain.com',
    avatar: 'https://picsum.photos/100/100?random=3'
  },
  {
    id: 2,
    name: 'Elektronomia',
    spotifyId: '7q2B2u5s3t3d2e1',
    appleMusicId: '18273645',
    email: 'mgmt@elektronomia.com',
    avatar: 'https://picsum.photos/100/100?random=4'
  }
];

export const MOCK_TRACKS: Track[] = [
  {
    id: 1001,
    isrc: 'US-LMG-24-00001',
    name: 'Neon Horizon',
    duration: '03:45',
    status: 'READY',
    releaseId: 485,
    artists: [{ name: 'Unknown Brain', role: 'Primary' }],
    contributors: [
        { name: 'Unknown Brain', role: 'Producer' },
        { name: 'John Doe', role: 'Composer' }
    ],
    hasLyrics: false,
    isExplicit: false,
    hasExplicitVersion: false
  },
  {
    id: 1002,
    isrc: 'US-LMG-24-00002',
    name: 'Cyberpunk Dreams',
    version: 'Extended Mix',
    duration: '04:12',
    status: 'PROCESSING',
    releaseId: 486,
    artists: [{ name: 'Elektronomia', role: 'Primary' }],
    contributors: [{ name: 'Elektronomia', role: 'Producer' }, { name: 'Elektronomia', role: 'Composer' }],
    hasLyrics: false,
    isExplicit: false,
    hasExplicitVersion: false
  },
  {
    id: 1003,
    isrc: 'US-LMG-24-00003',
    name: 'Void Echoes',
    artists: [{ name: 'Thereon', role: 'Primary' }],
    contributors: [{ name: 'Thereon', role: 'Producer' }, { name: 'Thereon', role: 'Composer' }],
    duration: '02:50',
    status: 'READY',
    hasLyrics: false,
    isExplicit: false,
    hasExplicitVersion: false
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'TXN-001', date: '2024-04-01', amount: 154.20, type: 'ROYALTY', status: 'COMPLETED' },
  { id: 'TXN-002', date: '2024-03-01', amount: 200.00, type: 'WITHDRAWAL', status: 'COMPLETED' },
  { id: 'TXN-003', date: '2024-02-01', amount: 89.50, type: 'ROYALTY', status: 'COMPLETED' },
  { id: 'TXN-004', date: '2024-01-15', amount: 312.00, type: 'ROYALTY', status: 'COMPLETED' },
  { id: 'TXN-005', date: '2023-12-01', amount: 1500.00, type: 'WITHDRAWAL', status: 'COMPLETED' },
];

export const MOCK_TICKETS: SupportTicket[] = [
  {
    id: 'TKT-7721',
    subject: 'Spotify URI Mapping Issue',
    category: 'DISTRIBUTION',
    status: 'OPEN',
    priority: 'HIGH',
    createdAt: '2024-05-18T10:00:00Z',
    updatedAt: '2024-05-18T10:00:00Z',
    messages: [
      {
        id: 'msg-1',
        senderName: 'Maikel S. Brain',
        role: 'USER',
        content: "Hello, my latest release 'Neon Horizon' is mapped to a wrong artist profile on Spotify. Can you fix the URI?",
        timestamp: '2024-05-18T10:00:00Z'
      }
    ]
  },
  {
    id: 'TKT-7710',
    subject: 'Withdrawal delay',
    category: 'FINANCIAL',
    status: 'RESOLVED',
    priority: 'MEDIUM',
    createdAt: '2024-05-10T09:00:00Z',
    updatedAt: '2024-05-12T14:30:00Z',
    messages: [
      {
        id: 'msg-1',
        senderName: 'Maikel S. Brain',
        role: 'USER',
        content: "My withdrawal from May 1st is still pending.",
        timestamp: '2024-05-10T09:00:00Z'
      },
      {
        id: 'msg-2',
        senderName: 'Aurora Admin',
        role: 'ADMIN',
        content: "Hello! We have processed your payment. It should reflect in your bank account within 24 hours.",
        timestamp: '2024-05-12T14:30:00Z'
      }
    ]
  }
];

// --- DASHBOARD STATISTICS ---
export const DASHBOARD_STATS = {
    totalStreams: "1,245,890",
    totalStreamsChange: "+12.5%",
    revenue: "$4,230.50",
    revenueChange: "+8.2%",
    activeReleases: "14",
    monthlyListeners: "85,420",
    monthlyListenersChange: "+24%"
};

export const DASHBOARD_CHART_DATA = [
  { name: 'Jan', streams: 4000 },
  { name: 'Feb', streams: 3000 },
  { name: 'Mar', streams: 2000 },
  { name: 'Apr', streams: 2780 },
  { name: 'May', streams: 1890 },
  { name: 'Jun', streams: 2390 },
  { name: 'Jul', streams: 3490 },
  { name: 'Aug', streams: 4200 },
  { name: 'Sep', streams: 3800 },
  { name: 'Oct', streams: 5100 },
  { name: 'Nov', streams: 4800 },
  { name: 'Dec', streams: 6000 },
];

// --- ANALYTICS STATISTICS ---
export const ANALYTICS_DAILY_DATA = [
  { day: 'Mon', streams: 1240 },
  { day: 'Tue', streams: 1950 },
  { day: 'Wed', streams: 1560 },
  { day: 'Thu', streams: 2100 },
  { day: 'Fri', streams: 2890 },
  { day: 'Sat', streams: 3450 },
  { day: 'Sun', streams: 2780 },
];

export const ANALYTICS_SOURCE_DATA = [
  { name: 'Spotify', value: 65, color: '#1DB954' },
  { name: 'Apple Music', value: 20, color: '#FA243C' },
  { name: 'YouTube Music', value: 10, color: '#FF0000' },
  { name: 'Other', value: 5, color: '#888888' },
];

// --- WALLET SUMMARY ---
export const WALLET_SUMMARY = {
    availableBalance: 1240.50,
    pendingClearance: 340.20,
    lifetimeEarnings: 12450.00
};
