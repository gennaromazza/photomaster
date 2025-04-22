export interface GalleryItem {
  id: number;
  name: string;
  description: string | null;
  shortDescription: string | null;
  slug: string;
  coverImage: string | null;
  headerImage: string | null;
  isPublic: boolean;
  password: string | null;
  expiryDate: string | null;
  layout: string;
  theme: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  eventId: number | null;
  downloadEnabled: boolean;
  selectionEnabled: boolean;
  clientMessage: string | null;
  showInClient: boolean;
  metaData: any | null;
  studio: string;
  watermarkEnabled: boolean;
  // Campi Social e SEO
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  seoKeywords: string | null;
  allowSocialSharing: boolean;
  // Social Media dello Studio
  instagramHandle: string | null;
  facebookPage: string | null;
  twitterHandle: string | null;
  pinterestHandle: string | null;
  tiktokHandle: string | null;
  // Opzioni per incentivare il tagging
  showFollowPrompt: boolean;
  showTaggingPrompt: boolean;
  followPromptText: string | null;
  taggingPromptText: string | null;
  socialSharingImage: string | null;
  // Notifiche
  notificationsEnabled: boolean;
  notificationEmailSubject: string | null;
  notificationEmailTemplate: string | null;
}

export interface GalleryFormValues {
  name: string;
  description?: string;
  eventId: number | null;
  isPublic: boolean;
  isPasswordProtected: boolean;
  password?: string;
  coverImage?: File | null;
  chapterId?: number | null;
}

export interface GalleryChapter {
  id: number;
  galleryId: number;
  title: string;
  description: string | null;
  sortOrder: number;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  photoCount?: number;
}

export interface Photo {
  id: number;
  galleryId: number;
  chapterId: number | null;
  title: string | null;
  caption: string | null; // Equivalente a description nel tipo Photo precedente
  path: string; // Percorso principale (equivalente a url)
  thumbnailPath: string | null; // Percorso della thumbnail (equivalente a thumbnailUrl)
  mediumPath: string | null; // Percorso dell'immagine media (MANCAVA)
  largePath: string | null; // Percorso dell'immagine grande
  webpPath: string | null; // Percorso del formato WebP
  filename: string;
  originalFilename: string;
  width: number | null;
  height: number | null;
  size: number;
  mimeType: string;
  isFeatured: boolean;
  isHidden: boolean;
  sortOrder: number;
  metaData: any | null;
  tags: string[] | null;
  uploadedAt: string; // Data di caricamento (equivalente a createdAt)
  uploadedBy: number | null; // ID dell'utente che ha caricato la foto
  orientation: 'landscape' | 'portrait' | 'square';
  
  // Campi calcolati (non nel DB)
  url?: string; // Alias per path (per compatibilità)
  thumbnailUrl?: string; // Alias per thumbnailPath (per compatibilità)
  mediumUrl?: string; // Alias per mediumPath (per compatibilità)
  largeUrl?: string; // Alias per largePath (per compatibilità)
  webpUrl?: string; // Alias per webpPath (per compatibilità)
  createdAt?: string; // Alias per uploadedAt (per compatibilità)
  likeCount?: number; // Calcolato dalla relazione
  commentCount?: number; // Calcolato dalla relazione
}

export interface PhotoLike {
  id: number;
  photoId: number;
  userId: number | null; // Opzionale, solo per utenti autenticati
  sessionId: string; // ID sessione per utenti non autenticati
  likedAt: string; // Data del like
  ipAddress: string | null; // Opzionale per statistiche
}

export interface PhotoComment {
  id: number;
  photoId: number;
  name: string; // Nome della persona che commenta
  email: string; // Email (non mostrata pubblicamente)
  comment: string; // Contenuto del commento
  status: string; // pending, approved, spam
  createdAt: string;
  userId: number | null; // Opzionale, solo per utenti autenticati
  ipAddress: string | null; // Opzionale per prevenire abusi
}

export interface PhotoSelection {
  id: number;
  galleryId: number;
  photoId: number;
  clientId: number | null; // Opzionale, solo per clienti registrati
  sessionId: string | null; // Per clienti non registrati
  clientEmail: string | null; // Email del cliente (per utenti non registrati)
  clientName: string | null; // Nome del cliente (per utenti non registrati)
  selectionType: string; // favorite, selected, rejected
  notes: string | null; // Note opzionali sulla selezione
  createdAt: string;
}

export interface GallerySubscription {
  id: number;
  galleryId: number;
  email: string;
  name: string | null;
  token: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryVideo {
  id: number;
  galleryId: number;
  chapterId: number | null;
  title: string;
  description: string | null;
  videoType: "youtube" | "vimeo" | "direct";
  videoId: string | null;
  videoUrl: string | null;
  embedCode: string | null;
  thumbnailUrl: string | null;
  thumbnailPath: string | null;
  isFeatured: boolean;
  isHidden: boolean;
  sortOrder: number;
  duration: number | null;
  addedAt: string;
  addedBy: number | null;
  metaData: any | null;
  tags: string[] | null;
  createdAt?: string; // Alias per addedAt (per compatibilità)
}

export interface SocialShare {
  id: number;
  galleryId: number;
  platform: string;
  url: string;
  title: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}