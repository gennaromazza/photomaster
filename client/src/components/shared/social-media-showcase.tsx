import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Twitter, Youtube, Globe, Linkedin } from 'lucide-react';
import { FaPinterest, FaTiktok } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { Settings } from '@shared/schema';

// Estensione del tipo Settings per supportare anche i campi con suffisso Url
type ExtendedSettings = Settings & {
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  tiktokUrl?: string | null;
  pinterestUrl?: string | null;
};
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Typi delle varianti supportate
type SocialMediaVariant = 'default' | 'minimal' | 'floating' | 'footer';

// Definizione dell'interfaccia
interface SocialMediaShowcaseProps {
  settings: Settings | ExtendedSettings | undefined;
  variant?: SocialMediaVariant;
  className?: string;
  title?: string;
  showFollowText?: boolean;
}

interface SocialMediaItem {
  id: string;
  url: string | null | undefined;
  name: string;
  icon: JSX.Element;
  color: string;
  hoverColor: string;
}

export const SocialMediaShowcase = ({
  settings,
  variant = 'default',
  className,
  title = "Seguici sui Social",
  showFollowText = true,
}: SocialMediaShowcaseProps) => {
  const [socialMedia, setSocialMedia] = useState<SocialMediaItem[]>([]);

  useEffect(() => {
    if (!settings) return;

    // Cast settings al tipo esteso per TypeScript
    const extSettings = settings as ExtendedSettings;

    // Prepara l'array dei social media utilizzando sia i campi standard che quelli con suffisso Url
    const socialItems: SocialMediaItem[] = [
      {
        id: 'facebook',
        url: settings.facebook || extSettings.facebookUrl,
        name: 'Facebook',
        icon: <Facebook size={variant === 'minimal' ? 18 : 24} />,
        color: 'text-blue-600',
        hoverColor: 'hover:bg-blue-600',
      },
      {
        id: 'instagram',
        url: settings.instagram || extSettings.instagramUrl,
        name: 'Instagram',
        icon: <Instagram size={variant === 'minimal' ? 18 : 24} />,
        color: 'text-pink-500',
        hoverColor: 'hover:bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600',
      },
      {
        id: 'twitter',
        url: settings.twitter || extSettings.twitterUrl,
        name: 'Twitter',
        icon: <Twitter size={variant === 'minimal' ? 18 : 24} />,
        color: 'text-sky-500',
        hoverColor: 'hover:bg-sky-500',
      },
      {
        id: 'youtube',
        url: settings.youtube || extSettings.youtubeUrl,
        name: 'YouTube',
        icon: <Youtube size={variant === 'minimal' ? 18 : 24} />,
        color: 'text-red-600',
        hoverColor: 'hover:bg-red-600',
      },
      {
        id: 'website',
        url: settings.website || extSettings.websiteUrl,
        name: 'Sito Web',
        icon: <Globe size={variant === 'minimal' ? 18 : 24} />,
        color: 'text-gray-600',
        hoverColor: 'hover:bg-gray-600',
      },
      {
        id: 'linkedin',
        url: settings.linkedinUrl,
        name: 'LinkedIn',
        icon: <Linkedin size={variant === 'minimal' ? 18 : 24} />,
        color: 'text-blue-700',
        hoverColor: 'hover:bg-blue-700',
      },
      {
        id: 'tiktok',
        url: settings.tiktokUrl,
        name: 'TikTok',
        icon: <FaTiktok size={variant === 'minimal' ? 18 : 24} />,
        color: 'text-black',
        hoverColor: 'hover:bg-black',
      },
      {
        id: 'pinterest',
        url: settings.pinterestUrl,
        name: 'Pinterest',
        icon: <FaPinterest size={variant === 'minimal' ? 18 : 24} />,
        color: 'text-red-500',
        hoverColor: 'hover:bg-red-500',
      },
    ];

    // Filtra i social media che hanno un URL valido
    const filteredSocial = socialItems.filter(
      (item) => item.url && item.url.trim() !== ''
    );

    setSocialMedia(filteredSocial);
  }, [settings, variant]);

  // Se non ci sono social media da mostrare, non renderizzare nulla
  if (!socialMedia.length) {
    return null;
  }

  // Renderizza la variante richiesta
  switch (variant) {
    case 'minimal':
      return (
        <div className={cn("flex items-center gap-2", className)}>
          {showFollowText && <span className="text-sm text-muted-foreground">Seguici:</span>}
          {socialMedia.map((item) => (
            <TooltipProvider key={item.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={item.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                      item.color,
                      "hover:text-white hover:border-transparent",
                      item.hoverColor
                    )}
                  >
                    {item.icon}
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      );

    case 'floating':
      return (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={cn(
            "fixed right-4 top-1/3 z-50 flex flex-col gap-2",
            className
          )}
        >
          {socialMedia.map((item) => (
            <motion.a
              key={item.id}
              href={item.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2, x: -5 }}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full shadow-lg",
                "bg-white text-gray-800 border border-gray-200",
                "hover:text-white hover:border-transparent",
                item.hoverColor
              )}
            >
              {item.icon}
            </motion.a>
          ))}
        </motion.div>
      );

    case 'footer':
      return (
        <div className={cn("flex flex-col items-center gap-3", className)}>
          {title && <h3 className="text-base font-medium mb-1">{title}</h3>}
          <div className="flex flex-wrap justify-center gap-3">
            {socialMedia.map((item) => (
              <a
                key={item.id}
                href={item.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full transition-transform",
                  "bg-gray-100 dark:bg-gray-800",
                  item.color,
                  "hover:scale-110"
                )}
              >
                {item.icon}
              </a>
            ))}
          </div>
        </div>
      );

    case 'default':
    default:
      return (
        <div className={className}>
          {title && <h3 className="text-lg font-medium mb-3">{title}</h3>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {socialMedia.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="overflow-hidden border-t-4 h-full" style={{ borderTopColor: item.color.includes('text-') ? item.color.replace('text-', 'var(--') + ')' : 'currentColor' }}>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center gap-3 py-2">
                      <div className={cn("rounded-full p-3", item.color)}>
                        {item.icon}
                      </div>
                      <h4 className="font-medium text-center">{item.name}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("w-full transition-colors", item.hoverColor, "hover:text-white")}
                        asChild
                      >
                        <a href={item.url || '#'} target="_blank" rel="noopener noreferrer">
                          Visita
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      );
  }
};