export interface Comment {
  user: string;
  text: string;
  timestamp: string;
}

export interface Photo {
  user: string;
  url: string;
  timestamp: string;
}

export interface OverrideRequest {
  requester: string;
  newArrangement: Record<string, string>;
  approvals: string[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface Arrangement {
  seats: Record<string, string>;
  comments: Comment[];
  photos: Photo[];
  override?: OverrideRequest;
}

export type Arrangements = Record<string, Arrangement>;
