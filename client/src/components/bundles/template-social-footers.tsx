import { Settings } from '@shared/schema';
import { SocialMediaFooter } from '@/components/shared/social-media-footer';

/**
 * Componente wrapper per i footer social nei template dei pacchetti
 * Questo componente standardizza l'implementazione dei social media nei template
 * e facilita il riutilizzo del codice.
 */
export const BundleTemplateSocialFooters = ({
  templateType,
  settings,
}: {
  templateType: 'elegant' | 'modern' | 'minimal' | 'bold';
  settings: Settings;
}) => {
  return <SocialMediaFooter settings={settings} variant={templateType} />;
};