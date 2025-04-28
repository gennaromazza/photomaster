// Tipi relativi al sistema di selezione
// Utilizziamo solo interfacce e non le definizioni Drizzle per evitare conflitti

export interface GallerySelectionSettings {
  id: number;
  galleryId: number;
  isEnabled: boolean;
  maxSelections: number;
  allowComments: boolean;
  expiresAt: Date | null;
  customMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectionSession {
  id: number;
  galleryId: number;
  clientId: number | null;
  clientName: string | null;
  sessionKey: string;
  status: 'active' | 'completed';
  startedAt: Date;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhotoSelection {
  selectionId: number; //Renamed here, assuming this is the correct location based on the user request.
  photoId: number;
  sessionId: number;
  createdAt: Date;
}

export interface PhotoComment {
  id: number;
  photoId: number;
  sessionId: number;
  content: string;
  userId: number | null;
  clientName: string | null;
  isRead: boolean;
  createdAt: Date;
}

// Interfacce per inserimenti
export interface InsertGallerySelectionSettings {
  galleryId: number;
  isEnabled?: boolean;
  maxSelections?: number;
  allowComments?: boolean;
  expiresAt?: Date | null;
  customMessage?: string | null;
}

export interface InsertSelectionSession {
  galleryId: number;
  clientId?: number | null;
  clientName: string;
  clientEmail?: string | null;
  sessionKey: string;
  notes?: string | null;
}

export interface InsertPhotoSelection {
  photoId: number;
  sessionId: number;
}

export interface InsertPhotoComment {
  photoId: number;
  sessionId: number;
  content: string;
  userId?: number | null;
  clientName?: string | null;
}

// Tipi di ritorno specializzati per le query
export interface PhotoSelectionWithPhotoDetails extends PhotoSelection {
  photo?: {
    filename: string;
    title?: string;
    description?: string;
    chapterId?: number;
  };
}

export interface PhotoCommentWithUser extends PhotoComment {
  user?: {
    fullName: string;
    username: string;
    profileImage?: string;
  };
}

export interface SelectionSessionWithCounts extends SelectionSession {
  selectionsCount: number;
  commentsCount: number;
  unreadCommentsCount: number;
}