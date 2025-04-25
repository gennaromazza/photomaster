import { useState } from 'react';
import { Settings } from '@shared/schema';
import { Instagram, Facebook, Twitter, Youtube, Linkedin, Share2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SocialMediaFooterProps {
  settings: Settings;
  variant?: 'minimal' | 'elegant' | 'modern' | 'bold';
}

export const SocialMediaFooter = ({ settings, variant = 'elegant' }: SocialMediaFooterProps) => {
  const [showSocial, setShowSocial] = useState(false);

  // Controlla se ci sono dei social media configurati
  const hasSocialMedia = !!(
    settings?.instagramUrl || 
    settings?.facebookUrl || 
    settings?.twitterUrl || 
    settings?.youtubeUrl || 
    settings?.tiktokUrl || 
    settings?.pinterestUrl || 
    settings?.linkedinUrl
  );

  if (!hasSocialMedia) return null;

  // Stili condizionali basati sul variant
  const getContainerClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'bg-white border-t py-4';
      case 'elegant':
        return 'bg-amber-50 py-6';
      case 'modern':
        return 'bg-gray-100 py-6';
      case 'bold':
        return 'bg-gray-900 text-white py-6';
      default:
        return 'bg-gray-100 py-6';
    }
  };

  const getIconClasses = () => {
    switch (variant) {
      case 'bold':
        return 'text-white hover:text-primary';
      default:
        return 'text-gray-700 hover:text-primary';
    }
  };

  const getButtonClasses = () => {
    switch (variant) {
      case 'bold':
        return 'text-white bg-gray-800 hover:bg-gray-700';
      case 'elegant':
        return 'text-amber-800 bg-amber-100 hover:bg-amber-200';
      case 'modern':
        return 'text-primary-600 bg-gray-200 hover:bg-gray-300';
      default:
        return 'text-primary bg-white hover:bg-gray-100';
    }
  };

  const getToggleText = () => {
    return showSocial ? 'Nascondi social' : 'Seguici';
  };

  const renderSocialIcons = () => {
    const iconSize = 20;
    const socialLinks = [];

    if (settings.instagramUrl) {
      socialLinks.push(
        <TooltipProvider key="instagram">
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={settings.instagramUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`${getIconClasses()} hover:scale-110 transition-all`}
                aria-label="Instagram"
              >
                <Instagram size={iconSize} />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>Seguici su Instagram</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (settings.facebookUrl) {
      socialLinks.push(
        <TooltipProvider key="facebook">
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={settings.facebookUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`${getIconClasses()} hover:scale-110 transition-all`}
                aria-label="Facebook"
              >
                <Facebook size={iconSize} />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>Seguici su Facebook</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (settings.twitterUrl) {
      socialLinks.push(
        <TooltipProvider key="twitter">
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={settings.twitterUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`${getIconClasses()} hover:scale-110 transition-all`}
                aria-label="Twitter"
              >
                <Twitter size={iconSize} />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>Seguici su Twitter</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (settings.youtubeUrl) {
      socialLinks.push(
        <TooltipProvider key="youtube">
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={settings.youtubeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`${getIconClasses()} hover:scale-110 transition-all`}
                aria-label="YouTube"
              >
                <Youtube size={iconSize} />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>Seguici su YouTube</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (settings.linkedinUrl) {
      socialLinks.push(
        <TooltipProvider key="linkedin">
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={settings.linkedinUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`${getIconClasses()} hover:scale-110 transition-all`}
                aria-label="LinkedIn"
              >
                <Linkedin size={iconSize} />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>Seguici su LinkedIn</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return socialLinks;
  };

  return (
    <div className={`w-full ${getContainerClasses()} transition-all duration-300`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center">
          <Button 
            variant="outline" 
            size="sm" 
            className={`mb-4 flex items-center gap-1.5 rounded-full px-4 ${getButtonClasses()}`}
            onClick={() => setShowSocial(!showSocial)}
          >
            {getToggleText()}
            <Share2 className="h-4 w-4" />
            {showSocial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {showSocial && (
            <div className="flex flex-wrap justify-center gap-6 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              {renderSocialIcons()}
            </div>
          )}
          
          <div className="flex flex-col items-center">
            <p className={`text-sm ${variant === 'bold' ? 'text-gray-400' : 'text-gray-600'}`}>
              © {new Date().getFullYear()} {settings.companyName}
            </p>
            {settings.companyDescription && (
              <p className={`text-xs mt-1 text-center max-w-xl ${variant === 'bold' ? 'text-gray-500' : 'text-gray-500'}`}>
                {settings.companyDescription}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};