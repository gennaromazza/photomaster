import { Facebook, Instagram, Twitter, Youtube, Globe, ArrowUpRight } from 'lucide-react';
import { Settings } from '@shared/schema';
import { Toggle } from '@/components/ui/toggle';
import { useState } from 'react';

interface SocialMediaFooterProps {
  settings: Settings;
  variant?: 'minimal' | 'elegant' | 'modern' | 'bold';
}

export const SocialMediaFooter = ({ settings, variant = 'elegant' }: SocialMediaFooterProps) => {
  const [showFollow, setShowFollow] = useState(false);
  
  const hasAnySocialMedia = settings.facebook || settings.instagram || settings.twitter || settings.youtube || settings.website;
  
  // Se non ci sono social media configurati, non visualizzare il componente
  if (!hasAnySocialMedia) return null;
  
  // Varianti di stile in base al template del pacchetto
  const getVariantStyles = () => {
    switch (variant) {
      case 'minimal':
        return {
          container: 'py-6 bg-gray-50',
          wrapper: 'container mx-auto px-4',
          title: 'text-sm font-medium text-gray-500 mb-4 flex items-center justify-center',
          socialContainer: 'flex justify-center space-x-4',
          socialItem: 'bg-white hover:bg-gray-100 text-gray-600 transition-colors p-3 rounded-lg shadow-sm',
          socialIcon: 'h-5 w-5',
          followToggle: 'px-3 py-2 border rounded-md text-xs bg-white shadow-sm hover:bg-gray-50 text-gray-600',
          followContainer: 'flex justify-center mb-4'
        };
      case 'modern':
        return {
          container: 'py-8 bg-gray-800',
          wrapper: 'container mx-auto px-4',
          title: 'text-sm font-medium text-gray-300 mb-4 flex items-center justify-center',
          socialContainer: 'flex justify-center space-x-6',
          socialItem: 'bg-gray-700 hover:bg-gray-600 text-white transition-colors p-3 rounded-md',
          socialIcon: 'h-5 w-5',
          followToggle: 'px-3 py-2 border border-gray-600 rounded-md text-xs bg-gray-700 hover:bg-gray-600 text-white',
          followContainer: 'flex justify-center mb-4'
        };
      case 'bold':
        return {
          container: 'py-8 bg-gray-900',
          wrapper: 'container mx-auto px-4',
          title: 'text-sm font-medium text-gray-300 mb-4 flex items-center justify-center',
          socialContainer: 'flex justify-center space-x-5',
          socialItem: 'bg-primary/80 hover:bg-primary text-white transition-colors p-3 rounded-full',
          socialIcon: 'h-5 w-5',
          followToggle: 'px-4 py-2 border border-primary/20 rounded-full text-xs bg-primary/10 hover:bg-primary/20 text-white',
          followContainer: 'flex justify-center mb-4'
        };
      case 'elegant':
      default:
        return {
          container: 'py-6 bg-white border-t',
          wrapper: 'container mx-auto px-4',
          title: 'text-sm font-medium text-gray-500 mb-4 flex items-center justify-center',
          socialContainer: 'flex justify-center space-x-4',
          socialItem: 'bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors p-3 rounded-full',
          socialIcon: 'h-5 w-5',
          followToggle: 'px-3 py-2 border rounded-full text-xs bg-white shadow-sm hover:bg-gray-50 text-gray-600',
          followContainer: 'flex justify-center mb-4'
        };
    }
  };
  
  const styles = getVariantStyles();
  
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.followContainer}>
          <Toggle
            aria-label="Seguici sui Social"
            pressed={showFollow}
            onPressedChange={setShowFollow}
            className={styles.followToggle}
          >
            {showFollow ? 'Nascondi Social' : 'Seguici sui Social'} <ArrowUpRight className="h-3 w-3 ml-1" />
          </Toggle>
        </div>
        
        {showFollow && (
          <>
            <h4 className={styles.title}>
              Seguici sui nostri canali social
            </h4>
            <div className={styles.socialContainer}>
              {settings.facebook && (
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialItem}
                  title="Facebook"
                >
                  <Facebook className={styles.socialIcon} />
                </a>
              )}
              
              {settings.instagram && (
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialItem}
                  title="Instagram"
                >
                  <Instagram className={styles.socialIcon} />
                </a>
              )}
              
              {settings.twitter && (
                <a
                  href={settings.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialItem}
                  title="Twitter"
                >
                  <Twitter className={styles.socialIcon} />
                </a>
              )}
              
              {settings.youtube && (
                <a
                  href={settings.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialItem}
                  title="YouTube"
                >
                  <Youtube className={styles.socialIcon} />
                </a>
              )}
              
              {settings.website && (
                <a
                  href={settings.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialItem}
                  title="Sito Web"
                >
                  <Globe className={styles.socialIcon} />
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};