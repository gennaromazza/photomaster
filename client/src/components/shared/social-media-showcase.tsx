
import { Facebook, Instagram, Twitter, Youtube, Globe } from 'lucide-react';
import { Settings } from '@shared/schema';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

interface SocialMediaShowcaseProps {
  settings: Settings;
  variant?: 'default' | 'minimal' | 'floating';
}

const socialIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  website: Globe,
};

const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const SocialMediaShowcase = ({ settings, variant = 'default' }: SocialMediaShowcaseProps) => {
  const socialLinks = [
    { key: 'facebook', url: settings.facebook, label: 'Seguici su Facebook' },
    { key: 'instagram', url: settings.instagram, label: 'Seguici su Instagram' },
    { key: 'twitter', url: settings.twitter, label: 'Seguici su Twitter' },
    { key: 'youtube', url: settings.youtube, label: 'Guarda i nostri video' },
    { key: 'website', url: settings.website, label: 'Visita il nostro sito' },
  ].filter(link => link.url);

  if (!socialLinks.length) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'minimal':
        return {
          container: 'flex gap-3 justify-center',
          item: 'hover:scale-110 transition-transform p-2 rounded-full bg-primary/10 hover:bg-primary/20',
          icon: 'h-5 w-5 text-primary',
        };
      case 'floating':
        return {
          container: 'fixed right-4 bottom-4 flex flex-col gap-2',
          item: 'hover:scale-110 transition-transform p-3 rounded-full bg-primary shadow-lg hover:shadow-xl hover:bg-primary/90',
          icon: 'h-6 w-6 text-white',
        };
      default:
        return {
          container: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4',
          item: 'group hover:scale-105 transition-all duration-300',
          icon: 'h-6 w-6 text-primary group-hover:text-primary-foreground',
        };
    }
  };

  const styles = getVariantStyles();

  if (variant === 'default') {
    return (
      <Card className="p-6">
        <CardContent className={styles.container}>
          {socialLinks.map((link, index) => {
            const Icon = socialIcons[link.key as keyof typeof socialIcons];
            return (
              <motion.a
                key={link.key}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 p-4 rounded-lg bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground transition-colors"
                initial="hidden"
                animate="visible"
                variants={variants}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className={styles.icon} />
                <span className="text-sm font-medium text-center">{link.label}</span>
              </motion.a>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={styles.container}>
      {socialLinks.map((link, index) => {
        const Icon = socialIcons[link.key as keyof typeof socialIcons];
        return (
          <motion.a
            key={link.key}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.item}
            initial="hidden"
            animate="visible"
            variants={variants}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={link.label}
          >
            <Icon className={styles.icon} />
          </motion.a>
        );
      })}
    </div>
  );
};
