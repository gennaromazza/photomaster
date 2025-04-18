export interface GalleryItem {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  coverImage: string | null;
  isPublic: boolean;
  password: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  userId: number;
  eventId: number | null;
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
  description: string | null;
  url: string;
  thumbnailUrl: string;
  originalFilename: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
}

export interface PhotoLike {
  id: number;
  photoId: number;
  userId: number | null;
  guestId: string | null;
  createdAt: string;
}

export interface PhotoComment {
  id: number;
  photoId: number;
  userId: number | null;
  guestId: string | null;
  guestName: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoSelection {
  id: number;
  photoId: number;
  galleryId: number;
  userId: number | null;
  guestId: string | null;
  guestName: string | null;
  notes: string | null;
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