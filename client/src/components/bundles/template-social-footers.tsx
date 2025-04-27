import { Settings } from '@shared/schema';
import { SocialMediaFooter } from '@/components/shared/social-media-footer';
import { SocialMediaShowcase } from '@/components/shared/social-media-showcase';

/**
 * Componente wrapper per i footer social nei template dei pacchetti
 * Questo componente standardizza l'implementazione dei social media nei template
 * e facilita il riutilizzo del codice.
 * 
 * Supporta sia il vecchio componente SocialMediaFooter che il nuovo SocialMediaShowcase
 * per garantire compatibilità e flessibilità.
 */
export const BundleTemplateSocialFooters = ({
  templateType,
  settings,
  useNewComponent = true,
}: {
  templateType: 'elegant' | 'modern' | 'minimal' | 'bold';
  settings: Settings;
  useNewComponent?: boolean;
}) => {
  // Utilizziamo il nuovo componente SocialMediaShowcase che supporta tutti i social network
  if (useNewComponent) {
    return (
      <SocialMediaShowcase 
        settings={settings} 
        variant="footer" 
        title="Seguici sui Social" 
      />
    );
  }
  
  // Fallback al vecchio componente per retrocompatibilità
  return <SocialMediaFooter settings={settings} variant={templateType} />;
};