

export interface Comment {
  user: string; // user uid or 'ai_assistant'
  text: string;
  timestamp: string;
}

export interface Photo {
  user: string; // user uid
  url: string; // Will store as a data URI
  timestamp: string;
}

export interface OverrideRequest {
  requester: string; // user uid
  newArrangement: Record<string, string>; // seat -> user uid
  approvals: string[]; // List of user uids who approved
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface Arrangement {
  seats: Record<string, string>; // seat -> user uid
  comments: Comment[];
  photos: Photo[];
  override?: OverrideRequest;
}

export type Arrangements = Record<string, Arrangement>;

// Firestore-related types
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  groupId: string | null;
  photoURL: string | null;
}

export interface Group {
  id: string;
  name: string;
  members: string[]; // array of user uids
  seats: string[]; // array of seat names
  arrangements: Arrangements;
  nonWorkingDays: string[];
  specialEvents: Record<string, string>;
}
