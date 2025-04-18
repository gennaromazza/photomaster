import { GalleryCard } from "./gallery-card";
import { GalleryItem } from "@/types/gallery";

interface GalleryGridProps {
  galleries: GalleryItem[];
}

export function GalleryGrid({ galleries }: GalleryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {galleries.map((gallery) => (
        <GalleryCard key={gallery.id} gallery={gallery} />
      ))}
    </div>
  );
}