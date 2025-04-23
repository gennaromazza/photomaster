
import { useParams } from 'wouter';
import SelectionInterface from '@/components/selection-system/client/SelectionInterface';

export default function PublicSelectionPage() {
  const { sessionKey, galleryId } = useParams();
  return (
    <SelectionInterface 
      sessionKey={sessionKey!} 
      galleryId={Number(galleryId)} 
    />
  );
}
