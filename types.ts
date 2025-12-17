
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
}

// Added missing Artist interface for the Roster
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
  legalName: string;
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
  details: string; // Masked account or email
  accountHolder?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  swiftCode?: string;
  paypalEmail?: string;
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