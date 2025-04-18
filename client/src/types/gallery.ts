export interface GalleryItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  eventId: number | null;
  status: string;
  password: string | null;
  coverImage: string | null;
  isPublic: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  event?: {
    id: number;
    title: string;
    date: string;
  };
}

export interface GalleryFormValues {
  name: string;
  description?: string;
  eventId?: number | null;
  password?: string;
  isPublic: boolean;
  isPasswordProtected: boolean;
}

export interface GalleryChapter {
  id: number;
  galleryId: number;
  title: string;
  description: string | null;
  slug: string;
  sortOrder: number;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryPhoto {
  id: number;
  galleryId: number;
  chapterId: number | null;
  filename: string;
  originalFilename: string;
  path: string;
  thumbnailPath: string;
  mediumPath: string;
  largePath: string;
  webpPath: string | null;
  size: number;
  width: number | null;
  height: number | null;
  mimeType: string;
  title: string | null;
  caption: string | null;
  isFeatured: boolean;
  isHidden: boolean;
  orientation: string;
  uploadedAt: string;
  uploadedBy: number | null;
  sortOrder: number | null;
  tags: string[] | null;
}