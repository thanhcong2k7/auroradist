export interface Release {
  id: number;
  upc: string;
  title: string;
  version?: string;
  artist: string; // Legacy/Display artist
  labelId?: number;
  status: 'DRAFT' | 'DELIVERED' | 'ERROR' | 'CHECKING' | 'ACCEPTED';
  releaseDate: string;
  originalReleaseDate?: string;
  coverArt: string;
  copyrightYear?: string;
  copyrightLine?: string;
  phonogramYear?: string;
  phonogramLine?: string;
}

export interface Label {
  id: number;
  name: string;
  email: string;
}

export interface Artist {
  id: number;
  name: string;
  legalName?: string;
  spotifyId?: string;
  appleMusicId?: string;
  soundcloudId?: string;
  email?: string;
  address?: string;
  avatar: string;
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
  instrument?: string; // Only for Performer
}

export interface Track {
  id: number;
  isrc: string;
  name: string;
  version?: string;
  duration: string;
  status: 'PROCESSING' | 'READY' | 'ERROR';
  releaseId?: number;
  
  // Audio File
  audioUrl?: string;
  filename?: string;

  // Credits
  artists: TrackArtist[];
  contributors: TrackContributor[];

  // Lyrics
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
