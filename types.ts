
export interface DspChannel {
  id: number;
  name: string;
  code: string;
  logoUrl?: string;
  isEnabled: boolean;
}

export interface Release {
  id: number;
  upc: string;
  title: string;
  version?: string;
  artist: string; 
  labelId?: number;
  status: 'DRAFT' | 'DELIVERED' | 'ERROR' | 'CHECKING' | 'ACCEPTED' | 'REJECTED' | 'TAKENDOWN';
  releaseDate: string;
  originalReleaseDate?: string;
  coverArt: string;
  copyrightYear?: string;
  copyrightLine?: string;
  phonogramYear?: string;
  phonogramLine?: string;
  selectedDsps?: string[];
  rejectionReason?: string;
}

export interface Artist {
  id: number;
  name: string;
  legalName?: string;
  email?: string;
  avatar: string;
  spotifyId?: string;
  appleMusicId?: string;
  soundcloudId?: string;
  address?: string;
}

export interface UserProfile {
  id: number;
  name: string;
  legal_name?: string; // Matching DB schema
  email: string;
  role: string;
  avatar?: string;
}

export interface ActionLog {
  id: string;
  releaseId?: number;
  releaseTitle?: string;
  action: 'SUBMIT_FOR_RELEASE' | 'REQUEST_TAKEDOWN' | 'DELETE' | 'METADATA_UPDATE' | 'WITHDRAWAL_REQUEST' | 'LABEL_ACTION';
  timestamp: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'COMPLETED' | 'FAILED';
  performedBy: string;
  details?: string;
}

export interface Label {
  id: number;
  name: string;
  email: string;
}

export interface PayoutMethod {
  id: string;
  type: 'BANK' | 'PAYPAL';
  name: string;
  details: string; 
  account_holder?: string;
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
  swift_code?: string;
  paypal_email?: string;
}

export interface TrackArtist {
  id?: number;
  name: string;
  role: 'Primary' | 'Featured' | 'Remixer';
  spotifyId?: string;
  appleMusicId?: string;
}

export interface TrackContributor {
  id?: number;
  name: string;
  role: 'Composer' | 'Lyricist' | 'Producer' | 'Performer';
  instrument?: string; 
}

export interface Track {
  id: number;
  isrc: string;
  name: string;
  version?: string;
  duration: string;
  status: 'PROCESSING' | 'READY' | 'ERROR';
  releaseId?: number;
  audioUrl?: string;
  filename?: string;
  artists: TrackArtist[];
  contributors: TrackContributor[];
  hasLyrics: boolean;
  lyricsLanguage?: string;
  lyricsText?: string;
  isExplicit: boolean;
  hasExplicitVersion: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'ROYALTY' | 'WITHDRAWAL';
  status: 'COMPLETED' | 'PENDING';
}

// Support Ticket System
export interface TicketMessage {
  id: string;
  senderName: string;
  role: 'USER' | 'ADMIN';
  content: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: 'TECHNICAL' | 'FINANCIAL' | 'DISTRIBUTION' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface UserProfile {
  id: number;
  name: string;
  legal_name?: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR'; // Quan trọng
  avatar?: string;
}

// Thêm Type cho Admin Stats (nếu cần sau này)
export interface AdminStats {
  pendingReleases: number;
  totalUsers: number;
  totalRevenue: number;
  flaggedTracks: number;
}