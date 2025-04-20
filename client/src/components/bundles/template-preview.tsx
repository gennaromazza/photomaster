import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';

// Formattazione prezzo in Euro
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

// Tipo di dati per la preview del template
interface TemplatePreviewProps {
  name: string;
  description?: string;
  imagePath?: string;
  totalPrice?: number;
  discountedPrice?: number;
  style: 'elegant' | 'modern' | 'minimal' | 'bold';
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  name,
  description = 'Descrizione del pacchetto fotografico che mostra i dettagli e i vantaggi inclusi.',
  imagePath,
  totalPrice = 150000, // 1500€ in centesimi come valore predefinito
  discountedPrice = 120000, // 1200€ in centesimi come valore predefinito
  style
}) => {
  const placeholderImage = 'https://images.unsplash.com/photo-1529634597503-139d3726fed9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1769&q=80';
  const displayImage = imagePath || placeholderImage;
  
  // Classi CSS specifiche per ogni stile
  const styles = {
    elegant: {
      container: 'bg-white shadow-md rounded-lg overflow-hidden border border-gray-100',
      header: 'bg-gradient-to-r from-gray-50 to-white border-b pt-8 pb-4',
      title: 'font-serif text-2xl text-gray-800',
      description: 'font-serif text-gray-600 italic',
      imageContainer: 'h-56 overflow-hidden',
      image: 'w-full h-full object-cover transition-transform duration-300 hover:scale-105',
      content: 'p-6 space-y-4',
      priceContainer: 'flex flex-col items-end',
      originalPrice: 'text-sm text-gray-500 line-through',
      discountedPrice: 'text-xl font-serif text-primary',
      featuresContainer: 'space-y-2',
      featureItem: 'flex items-center text-gray-700',
      featureIcon: 'text-primary h-4 w-4 mr-2',
    },
    modern: {
      container: 'bg-white shadow-lg rounded-xl overflow-hidden',
      header: 'p-6 bg-primary/5',
      title: 'text-2xl font-bold text-primary',
      description: 'text-gray-600',
      imageContainer: 'h-60 overflow-hidden',
      image: 'w-full h-full object-cover transition-all duration-300 hover:brightness-110',
      content: 'p-6 space-y-4',
      priceContainer: 'flex flex-col items-start',
      originalPrice: 'text-sm text-gray-500 line-through',
      discountedPrice: 'text-3xl font-bold text-primary',
      featuresContainer: 'space-y-3 mt-4',
      featureItem: 'flex items-center text-gray-700',
      featureIcon: 'text-primary h-4 w-4 mr-2',
    },
    minimal: {
      container: 'bg-white shadow-sm rounded-md overflow-hidden border border-gray-200',
      header: 'p-4',
      title: 'text-xl font-medium text-gray-900',
      description: 'text-gray-500 text-sm',
      imageContainer: 'h-48 overflow-hidden',
      image: 'w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500',
      content: 'p-4 space-y-3',
      priceContainer: 'flex items-baseline justify-between',
      originalPrice: 'text-xs text-gray-500 line-through',
      discountedPrice: 'text-lg font-medium text-gray-900',
      featuresContainer: 'space-y-2 mt-4 text-sm',
      featureItem: 'flex items-center text-gray-600',
      featureIcon: 'text-gray-400 h-3 w-3 mr-2',
    },
    bold: {
      container: 'bg-gradient-to-br from-primary/90 to-primary rounded-xl overflow-hidden shadow-xl',
      header: 'p-6 text-white',
      title: 'text-2xl font-bold text-white',
      description: 'text-white/80',
      imageContainer: 'h-60 overflow-hidden',
      image: 'w-full h-full object-cover brightness-90 hover:brightness-100 transition-all duration-300',
      content: 'p-6 space-y-4 text-white',
      priceContainer: 'flex flex-col items-center',
      originalPrice: 'text-sm text-white/70 line-through',
      discountedPrice: 'text-3xl font-bold text-white',
      featuresContainer: 'space-y-3 mt-4',
      featureItem: 'flex items-center text-white/90',
      featureIcon: 'text-white h-4 w-4 mr-2',
    },
  };
  
  const selectedStyle = styles[style];
  
  // Funzionalità di esempio da mostrare nella preview
  const features = [
    "Sessione fotografica completa",
    "Fotografie in alta risoluzione",
    "Consegna digitale inclusa",
    "Post-produzione professionale",
  ];

  return (
    <div className={selectedStyle.container}>
      <div className={selectedStyle.header}>
        <h3 className={selectedStyle.title}>{name}</h3>
        <p className={selectedStyle.description}>{description}</p>
      </div>
      
      <div className={selectedStyle.imageContainer}>
        <img 
          src={displayImage} 
          alt={name} 
          className={selectedStyle.image}
        />
      </div>
      
      <div className={selectedStyle.content}>
        <div className={selectedStyle.priceContainer}>
          <span className={selectedStyle.originalPrice}>{formatPrice(totalPrice)}</span>
          <span className={selectedStyle.discountedPrice}>{formatPrice(discountedPrice)}</span>
        </div>
        
        <div className={selectedStyle.featuresContainer}>
          {features.map((feature, i) => (
            <div key={i} className={selectedStyle.featureItem}>
              <Check className={selectedStyle.featureIcon} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Componente che mostra tutti i template disponibili per la selezione
export const TemplatePreviews: React.FC<{
  bundleName: string;
  bundleImagePath?: string;
  selectedStyle: 'elegant' | 'modern' | 'minimal' | 'bold';
  onSelectStyle: (style: 'elegant' | 'modern' | 'minimal' | 'bold') => void;
}> = ({ bundleName, bundleImagePath, selectedStyle, onSelectStyle }) => {
  const templates = [
    { id: 'elegant', name: 'Elegante', style: 'elegant' as const },
    { id: 'modern', name: 'Moderno', style: 'modern' as const },
    { id: 'minimal', name: 'Minimalista', style: 'minimal' as const },
    { id: 'bold', name: 'Audace', style: 'bold' as const }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="space-y-2">
            <div
              className={`relative cursor-pointer rounded-md overflow-hidden transition-all ${
                selectedStyle === template.style
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'hover:ring-1 hover:ring-primary/50 hover:ring-offset-1'
              }`}
              onClick={() => onSelectStyle(template.style)}
            >
              <div className="transform scale-75 pointer-events-none">
                <TemplatePreview 
                  name={bundleName || "Nome Pacchetto"} 
                  imagePath={bundleImagePath}
                  style={template.style} 
                />
              </div>
              
              {selectedStyle === template.style && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-primary text-white">Selezionato</Badge>
                </div>
              )}
            </div>
            <p className="text-center font-medium">{template.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};