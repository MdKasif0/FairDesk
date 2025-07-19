export interface Comment {
  user: string;
  text: string;
  timestamp: string;
}

export interface Photo {
  user: string;
  url: string; // Will store as a data URI
  timestamp: string;
}

export interface OverrideRequest {
  requester: string;
  newArrangement: Record<string, string>;
  approvals: string[]; // List of users who approved
  status: 'pending' | 'approved' | 'rejected';
}

export interface Arrangement {
  seats: Record<string, string>;
  comments: Comment[];
  photos: Photo[];
  override?: OverrideRequest;
}

export type Arrangements = Record<string, Arrangement>;
