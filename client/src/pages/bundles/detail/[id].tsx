import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ServiceBundle, Service, Settings, BundleLead } from '@shared/schema';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, Phone, Mail, MapPin, Star, Camera, Video, Clock, Calendar, Heart, MessagesSquare, Instagram, Facebook, Twitter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';

// Formattazione prezzo in Euro
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

// Schema per il form di richiesta pacchetto
const requestBundleSchema = z.object({
  firstName: z.string().min(1, "Il nome è obbligatorio"),
  lastName: z.string().min(1, "Il cognome è obbligatorio"),
  email: z.string().email("Email non valida").min(1, "L'email è obbligatoria"),
  phone: z.string().optional(),
  message: z.string().optional(),
});

type RequestBundleValues = z.infer<typeof requestBundleSchema>;

// Funzione per creare URL di WhatsApp
const getWhatsAppUrl = (phone: string, message: string = "Ciao, vorrei informazioni sul vostro pacchetto fotografico.") => {
  // Rimuovi spazi e caratteri speciali dal numero
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  // Prepara l'URL per WhatsApp
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

// Funzione per creare URL di Email
const getEmailUrl = (email: string, subject: string = "Richiesta informazioni pacchetto fotografico", body: string = "Buongiorno,\n\nvorrei ricevere maggiori informazioni sul vostro pacchetto fotografico.\n\nGrazie") => {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

// Componente di dettaglio template Elegante
const ElegantTemplate: React.FC<{
  bundle: ServiceBundle & { items?: { service: Service; quantity: number }[] };
  settings: Settings;
  onRequestBundle: () => void;
}> = ({ bundle, settings, onRequestBundle }) => {
  const placeholderImage = 'https://images.unsplash.com/photo-1529634597503-139d3726fed9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1769&q=80';
  const displayImage = bundle.imagePath || placeholderImage;

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <header className="relative w-full h-96 overflow-hidden">
        <div className="absolute inset-0 bg-black/25 z-10"></div>
        <img 
          src={displayImage} 
          alt={bundle.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 p-8 z-20 bg-gradient-to-t from-black/70 to-transparent">
          <div className="container mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">{bundle.name}</h1>
            <p className="text-white/90 text-lg md:text-xl font-serif italic max-w-2xl">
              {bundle.description || 'Scopri questo fantastico pacchetto fotografico creato appositamente per soddisfare le tue esigenze.'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Package Details */}
          <div className="lg:col-span-2 space-y-10">
            <div className="prose max-w-none">
              <h2 className="text-3xl font-serif text-gray-800 mb-6">Dettagli del Pacchetto</h2>
              <p className="text-gray-600 text-lg mb-8">
                {bundle.description || 'Questo pacchetto fotografico offre una combinazione perfetta di servizi professionali per catturare i tuoi momenti più preziosi con uno stile elegante e senza tempo.'}
              </p>

              <h3 className="text-2xl font-serif text-gray-800 mt-10 mb-4">Servizi Inclusi</h3>
              <div className="space-y-4 mb-10">
                {bundle.items?.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row items-start p-4 border border-gray-100 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow duration-300">
                    {item.service.imagePath && (
                      <div className="w-full md:w-1/4 h-48 md:h-32 mb-4 md:mb-0 md:mr-4 overflow-hidden rounded-md">
                        <img 
                          src={item.service.imagePath} 
                          alt={item.service.name} 
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                    )}
                    <div className={`${item.service.imagePath ? 'md:w-3/4' : 'w-full'}`}>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-4 mt-1">
                          <Check className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-lg font-medium text-gray-900 mb-1">{item.service.name}</h4>
                          <p className="text-gray-600 mb-1">
                            {item.service.description || 'Servizio professionale di alta qualità.'}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="mt-1 text-xs">
                              {item.quantity > 1 ? `${item.quantity}x` : ''}
                              {' '}{formatPrice(item.service.price)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Pricing & CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-8">
              <Card className="border-gray-200 shadow-md overflow-hidden">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-serif text-gray-800">Prezzo</h3>
                    <div className="flex items-center">
                      <p className="text-gray-500 line-through mr-2">{formatPrice(bundle.totalPrice)}</p>
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                        {bundle.discountType === 'percentage' 
                          ? `-${bundle.discountValue}%` 
                          : `-${formatPrice(bundle.discountValue)}`}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold text-primary">
                      {formatPrice(bundle.discountedPrice)}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <Button 
                      className="w-full h-12 text-base" 
                      onClick={onRequestBundle}
                    >
                      Richiedi Questo Pacchetto
                    </Button>
                    
                    <p className="text-sm text-gray-500 text-center">
                      Ricevi un preventivo personalizzato basato su questo pacchetto
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Informazioni di Contatto</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-primary mr-2" />
                        <span className="text-gray-700">{settings.companyPhone || '+39 123 456 7890'}</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-primary mr-2" />
                        <span className="text-gray-700">{settings.companyEmail}</span>
                      </div>
                      {settings.companyAddress && (
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 text-primary mr-2 mt-1 flex-shrink-0" />
                          <span className="text-gray-700">{settings.companyAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Elegant Style */}
      <footer className="bg-gray-50 border-t py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-serif text-gray-800 mb-2">{settings.companyName}</h2>
            <div className="h-0.5 w-24 bg-primary/30 mx-auto"></div>
          </div>
          
          <p className="text-gray-600 max-w-2xl mx-auto mb-8 italic">
            "{settings.companyDescription || 'Specializzati in fotografia artistica di altissima qualità, catturiamo i tuoi momenti speciali con uno stile unico e sofisticato.'}"
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-gray-500">Telefono</p>
              <p className="font-medium">{settings.companyPhone || ''}</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{settings.companyEmail}</p>
            </div>
            
            {settings.companyAddress && (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-gray-500">Indirizzo</p>
                <p className="font-medium">{settings.companyAddress}</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-center space-x-4">
            <a href={getEmailUrl(settings.companyEmail)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="rounded-full px-5">
                <Mail className="mr-2 h-4 w-4" />
                Contattaci
              </Button>
            </a>
            <a href={getWhatsAppUrl(settings.companyPhone || '')} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="rounded-full px-5">
                <Phone className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          </div>
          
          <div className="mt-8 text-xs text-gray-400">
            &copy; {new Date().getFullYear()} {settings.companyName}. Tutti i diritti riservati.
          </div>
        </div>
      </footer>
    </div>
  );
};

// Componente di dettaglio template Moderno
const ModernTemplate: React.FC<{
  bundle: ServiceBundle & { items?: { service: Service; quantity: number }[] };
  settings: Settings;
  onRequestBundle: () => void;
}> = ({ bundle, settings, onRequestBundle }) => {
  const placeholderImage = 'https://images.unsplash.com/photo-1529634597503-139d3726fed9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1769&q=80';
  const displayImage = bundle.imagePath || placeholderImage;

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <header className="relative w-full h-screen overflow-hidden bg-primary/5">
        <div className="container mx-auto h-full flex items-center px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 max-w-xl">
              <Badge className="px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-none">
                Pacchetto Fotografico
              </Badge>
              <h1 className="text-5xl font-bold text-gray-900">{bundle.name}</h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                {bundle.description || 'Scopri l\'esperienza fotografica definitiva con il nostro pacchetto premium, progettato per catturare ogni momento importante del tuo evento.'}
              </p>
              <div className="pt-4 flex items-center space-x-4">
                <Button onClick={onRequestBundle} size="lg" className="px-8">
                  Richiedi Preventivo
                </Button>
                <div className="flex flex-col">
                  <span className="text-gray-500 line-through">{formatPrice(bundle.totalPrice)}</span>
                  <span className="text-2xl font-bold text-primary">{formatPrice(bundle.discountedPrice)}</span>
                </div>
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="absolute -top-10 -bottom-10 w-[130%] right-0 rounded-l-full bg-primary/10 -z-10"></div>
              <img 
                src={displayImage} 
                alt={bundle.name} 
                className="w-full h-[500px] object-cover rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-20 px-4">
        <div className="text-center mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Cosa Include Questo Pacchetto</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Abbiamo selezionato attentamente i migliori servizi per offrirti un'esperienza fotografica completa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {bundle.items?.map((item, index) => (
            <Card key={index} className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="h-2 bg-primary"></div>
              {item.service.imagePath && (
                <div className="w-full h-48 overflow-hidden">
                  <img 
                    src={item.service.imagePath} 
                    alt={item.service.name} 
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              )}
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  {item.service.type === 'service' ? (
                    <Camera className="h-6 w-6 text-primary" />
                  ) : (
                    <Video className="h-6 w-6 text-primary" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.service.name}</h3>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {item.service.description || 'Servizio professionale di alta qualità.'}
                </p>
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="font-medium">
                    {item.quantity > 1 ? `${item.quantity}x` : ''}
                    {' '}{formatPrice(item.service.price)}
                  </Badge>
                  {item.quantity > 1 && (
                    <span className="text-sm text-gray-500">Quantità: {item.quantity}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-primary/5 rounded-xl p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Richiedi Subito Questo Pacchetto</h2>
              <p className="text-gray-600 mb-6">
                Compila il form per ricevere un preventivo personalizzato e tutte le informazioni di cui hai bisogno.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-primary mr-3" />
                  <span className="text-gray-700">Risposta rapida entro 24 ore</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-primary mr-3" />
                  <span className="text-gray-700">Preventivo personalizzato</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-primary mr-3" />
                  <span className="text-gray-700">Consulenza gratuita</span>
                </div>
                <div className="pt-4">
                  <Button onClick={onRequestBundle} size="lg">
                    Richiedi Informazioni
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                <div className="mr-4 bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefono</p>
                  <p className="font-medium">{settings.companyPhone || '+39 123 456 7890'}</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                <div className="mr-4 bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{settings.companyEmail}</p>
                </div>
              </div>
              {settings.companyAddress && (
                <div className="flex items-start p-4 bg-white rounded-lg shadow-sm">
                  <div className="mr-4 bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mt-1">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Indirizzo</p>
                    <p className="font-medium">{settings.companyAddress}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Modern Style */}
      <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="relative mb-8 md:mb-0">
              <h2 className="text-2xl font-bold mb-2 relative z-10">{settings.companyName}</h2>
              <div className="absolute -bottom-1 left-0 w-12 h-1 bg-primary"></div>
              <p className="text-gray-400 max-w-md mt-4">{settings.companyDescription || 'Fotografia professionale di alta qualità'}</p>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              <a 
                href={getEmailUrl(settings.companyEmail)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 transition-colors duration-300 px-4 py-3 rounded-md flex items-center"
              >
                <Mail className="mr-2 h-5 w-5 text-primary" />
                <span>{settings.companyEmail}</span>
              </a>
              
              {settings.companyPhone && (
                <a 
                  href={getWhatsAppUrl(settings.companyPhone)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 transition-colors duration-300 px-4 py-3 rounded-md flex items-center"
                >
                  <Phone className="mr-2 h-5 w-5 text-primary" />
                  <span>{settings.companyPhone}</span>
                </a>
              )}
              
              {settings.companyAddress && (
                <div className="bg-white/10 px-4 py-3 rounded-md flex items-center">
                  <MapPin className="mr-2 h-5 w-5 text-primary" />
                  <span>{settings.companyAddress}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Camera className="mr-2 h-4 w-4 text-primary" />
                Servizi
              </h3>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white transition-colors">Fotografia di matrimonio</li>
                <li className="hover:text-white transition-colors">Servizi per eventi</li>
                <li className="hover:text-white transition-colors">Ritratti</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="mr-2 h-4 w-4 text-primary" />
                Orari
              </h3>
              <ul className="space-y-2 text-gray-400">
                <li>Lun - Ven: 9:00 - 18:00</li>
                <li>Sabato: 10:00 - 15:00</li>
                <li>Domenica: Chiuso</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Heart className="mr-2 h-4 w-4 text-primary" />
                Seguici
              </h3>
              <div className="flex space-x-3">
                <div className="bg-white/10 hover:bg-white/20 transition-colors duration-300 w-10 h-10 rounded-full flex items-center justify-center">
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <Instagram className="h-5 w-5" />
                  </a>
                </div>
                <div className="bg-white/10 hover:bg-white/20 transition-colors duration-300 w-10 h-10 rounded-full flex items-center justify-center">
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <Facebook className="h-5 w-5" />
                  </a>
                </div>
                <div className="bg-white/10 hover:bg-white/20 transition-colors duration-300 w-10 h-10 rounded-full flex items-center justify-center">
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MessagesSquare className="mr-2 h-4 w-4 text-primary" />
                Contattaci
              </h3>
              <div className="space-y-3">
                <Button className="w-full" onClick={onRequestBundle}>
                  Richiedi Preventivo
                </Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-10 pt-6 text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} {settings.companyName}. Tutti i diritti riservati.
          </div>
        </div>
      </footer>
    </div>
  );
};

// Componente di dettaglio template Minimal
const MinimalTemplate: React.FC<{
  bundle: ServiceBundle & { items?: { service: Service; quantity: number }[] };
  settings: Settings;
  onRequestBundle: () => void;
}> = ({ bundle, settings, onRequestBundle }) => {
  const placeholderImage = 'https://images.unsplash.com/photo-1529634597503-139d3726fed9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1769&q=80';
  const displayImage = bundle.imagePath || placeholderImage;

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <header className="py-8 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-medium text-center">{settings.companyName}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-12 px-4 max-w-4xl">
        <div className="mb-12">
          <h2 className="text-3xl font-medium mb-2 text-center">{bundle.name}</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto">
            {bundle.description || 'Un pacchetto fotografico essenziale e raffinato che si concentra sulla qualità delle immagini e sul servizio.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div>
            <img 
              src={displayImage} 
              alt={bundle.name} 
              className="w-full h-96 object-cover grayscale hover:grayscale-0 transition-all duration-500 ease-in-out"
            />
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-1">Dettagli</h3>
              <p className="text-gray-600 mb-6">
                {bundle.description || 'Questo pacchetto è stato attentamente curato per offrire un servizio fotografico completo con un design minimalista e funzionale.'}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Prezzo</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-xs text-gray-500 line-through">{formatPrice(bundle.totalPrice)}</span>
                <span className="text-xl font-medium">{formatPrice(bundle.discountedPrice)}</span>
              </div>
            </div>

            <Button 
              onClick={onRequestBundle}
              className="w-full"
              variant="outline"
            >
              Richiedi
            </Button>
          </div>
        </div>

        <Separator className="mb-16" />

        <div className="mb-16">
          <h3 className="text-2xl font-medium mb-8 text-center">Cosa Include</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bundle.items?.map((item, index) => (
              <div key={index} className="border p-4 space-y-2">
                {item.service.imagePath && (
                  <div className="w-full h-48 mb-3 overflow-hidden">
                    <img 
                      src={item.service.imagePath} 
                      alt={item.service.name} 
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500 ease-in-out"
                    />
                  </div>
                )}
                <h4 className="font-medium">{item.service.name}</h4>
                <p className="text-gray-600 text-sm">
                  {item.service.description || 'Servizio fotografico professionale.'}
                </p>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm">{formatPrice(item.service.price)}</span>
                  {item.quantity > 1 && (
                    <Badge variant="outline">x{item.quantity}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="mb-16" />

        <div className="text-center mb-16">
          <h3 className="text-2xl font-medium mb-8">Contatti</h3>
          <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-12 mb-8">
            <div className="flex items-center justify-center">
              <Phone className="h-4 w-4 mr-2 text-gray-500" />
              <span>{settings.companyPhone || '+39 123 456 7890'}</span>
            </div>
            <div className="flex items-center justify-center">
              <Mail className="h-4 w-4 mr-2 text-gray-500" />
              <span>{settings.companyEmail}</span>
            </div>
            {settings.companyAddress && (
              <div className="flex items-center justify-center">
                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                <span>{settings.companyAddress}</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-center space-x-4">
            <a href={getEmailUrl(settings.companyEmail)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
            </a>
            <a href={getWhatsAppUrl(settings.companyPhone || '')} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Phone className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </main>

      {/* Footer - Minimal Style */}
      <footer className="border-t py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-medium text-gray-800 mb-4">{settings.companyName}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {settings.companyDescription || 'Fotografia essenziale e raffinata che cattura momenti autentici con stile minimalista.'}
              </p>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Contatti</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                {settings.companyPhone && (
                  <li className="flex items-center justify-center md:justify-start">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{settings.companyPhone}</span>
                  </li>
                )}
                <li className="flex items-center justify-center md:justify-start">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{settings.companyEmail}</span>
                </li>
                {settings.companyAddress && (
                  <li className="flex items-start justify-center md:justify-start">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                    <span>{settings.companyAddress}</span>
                  </li>
                )}
              </ul>
            </div>
            
            <div className="text-center md:text-right">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Collegamenti Rapidi</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-primary transition-colors">Servizi</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pacchetti</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Preventivi</a></li>
                <li>
                  <Button 
                    variant="link" 
                    className="text-sm p-0 h-auto font-normal text-gray-500 hover:text-primary"
                    onClick={onRequestBundle}
                  >
                    Richiedi Preventivo
                  </Button>
                </li>
              </ul>
            </div>
          </div>
          
          <Separator className="mb-8" />
          
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-gray-400 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} {settings.companyName}. Tutti i diritti riservati.
            </p>
            
            <div className="flex space-x-6">
              <a 
                href={getEmailUrl(settings.companyEmail)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
              </a>
              
              {settings.companyPhone && (
                <a 
                  href={getWhatsAppUrl(settings.companyPhone)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
              
              <a 
                href="#" 
                className="text-gray-400 hover:text-primary transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              
              <a 
                href="#" 
                className="text-gray-400 hover:text-primary transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Componente di dettaglio template Bold
const BoldTemplate: React.FC<{
  bundle: ServiceBundle & { items?: { service: Service; quantity: number }[] };
  settings: Settings;
  onRequestBundle: () => void;
}> = ({ bundle, settings, onRequestBundle }) => {
  const placeholderImage = 'https://images.unsplash.com/photo-1529634597503-139d3726fed9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1769&q=80';
  const displayImage = bundle.imagePath || placeholderImage;

  return (
    <div className="min-h-screen">
      {/* Header - Full Width Hero */}
      <div className="bg-primary text-white">
        <header className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-xl font-bold">{settings.companyName}</h1>
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2" />
              <span className="text-sm">{settings.companyPhone || ''}</span>
            </div>
            <Button variant="secondary" size="sm" className="bg-white text-primary hover:bg-white/90" onClick={onRequestBundle}>
              Richiedi Ora
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white/20 text-white border-none hover:bg-white/30">
                Pacchetto Premium
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold">{bundle.name}</h1>
              <p className="text-xl text-white/80">
                {bundle.description || 'Un\'esperienza fotografica straordinaria che cattura la tua personalità con uno stile audace e distintivo.'}
              </p>
              <div className="flex items-baseline space-x-4">
                <span className="text-white/60 line-through">{formatPrice(bundle.totalPrice)}</span>
                <span className="text-3xl font-bold">{formatPrice(bundle.discountedPrice)}</span>
              </div>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90" onClick={onRequestBundle}>
                Richiedi Questo Pacchetto
              </Button>
            </div>
            <div className="relative hidden md:block">
              <div className="absolute -inset-4 bg-white/10 rounded-lg -z-10 rotate-3"></div>
              <img 
                src={displayImage} 
                alt={bundle.name} 
                className="w-full h-[450px] object-cover rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Cosa Offriamo</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Il nostro pacchetto è stato progettato per offrire un'esperienza completa e di qualità superiore.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {bundle.items?.map((item, index) => (
              <div 
                key={index} 
                className="overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 hover:shadow-lg transition-all duration-300"
              >
                {item.service.imagePath && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={item.service.imagePath} 
                      alt={item.service.name} 
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-8">
                  <div className="bg-primary w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    {item.service.type === 'service' ? (
                      <Camera className="h-6 w-6 text-white" />
                    ) : (
                      <Video className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.service.name}</h3>
                  <p className="text-gray-600 mb-6">
                    {item.service.description || 'Servizio di alta qualità con attenzione ai dettagli.'}
                  </p>
                  <div className="flex justify-between items-center">
                    <Badge className="bg-primary/10 text-primary border-none hover:bg-primary/20">
                      {formatPrice(item.service.price)}
                    </Badge>
                    {item.quantity > 1 && (
                      <Badge variant="outline">
                        Quantità: {item.quantity}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-primary to-primary/90 text-white rounded-2xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-12 md:p-16 space-y-6">
                <h2 className="text-3xl font-bold">Pronto a Prenotare?</h2>
                <p className="text-white/80">
                  Richiedi ora il tuo pacchetto e ricevi un preventivo personalizzato. Il primo passo verso immagini indimenticabili.
                </p>
                <div className="space-y-4 pt-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span>Preventivo senza impegno</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span>Consulenza personalizzata</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span>Risposta entro 24 ore</span>
                  </div>
                  <div className="pt-4">
                    <Button 
                      size="lg" 
                      className="bg-white text-primary hover:bg-white/90"
                      onClick={onRequestBundle}
                    >
                      Richiedi Informazioni
                    </Button>
                  </div>
                </div>
              </div>
              <div className="relative hidden md:block">
                <img 
                  src={displayImage} 
                  alt="Contact" 
                  className="w-full h-full object-cover brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Bold Style */}
      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center mb-12">
            <div className="bg-white/10 w-24 h-24 rounded-full flex items-center justify-center mb-6">
              <Camera className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">{settings.companyName}</h2>
            <div className="h-1 w-20 bg-primary mb-6 mx-auto rounded-full"></div>
            <p className="text-gray-300 max-w-2xl mb-8">
              {settings.companyDescription || 'Fotografia professionale che racconta storie uniche attraverso immagini straordinarie.'}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {settings.companyPhone && (
                <a 
                  href={getWhatsAppUrl(settings.companyPhone)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-primary hover:text-white transition-all duration-300 rounded-full py-3 px-6 flex items-center"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  <span>{settings.companyPhone}</span>
                </a>
              )}
              
              <a 
                href={getEmailUrl(settings.companyEmail)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-primary hover:text-white transition-all duration-300 rounded-full py-3 px-6 flex items-center"
              >
                <Mail className="mr-2 h-5 w-5" />
                <span>{settings.companyEmail}</span>
              </a>
              
              {settings.companyAddress && (
                <div className="bg-white/10 rounded-full py-3 px-6 flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  <span>{settings.companyAddress}</span>
                </div>
              )}
            </div>
            
            <Button 
              onClick={onRequestBundle}
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-8"
            >
              Richiedi il Tuo Pacchetto Ora
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/10 pt-12">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-6">I Nostri Servizi</h3>
              <div className="space-y-3">
                <p className="text-gray-400">Fotografia di Matrimonio</p>
                <p className="text-gray-400">Book Fotografici</p>
                <p className="text-gray-400">Eventi Speciali</p>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-bold mb-6">Orari Studio</h3>
              <div className="space-y-3">
                <p className="text-gray-400">Lunedì - Venerdì: 9:00 - 18:00</p>
                <p className="text-gray-400">Sabato: 10:00 - 15:00</p>
                <p className="text-gray-400">Domenica: Chiuso</p>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-bold mb-6">Seguici</h3>
              <div className="flex justify-center space-x-6">
                <a href="#" className="bg-white/10 hover:bg-primary transition-all duration-300 w-12 h-12 rounded-full flex items-center justify-center">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="bg-white/10 hover:bg-primary transition-all duration-300 w-12 h-12 rounded-full flex items-center justify-center">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="bg-white/10 hover:bg-primary transition-all duration-300 w-12 h-12 rounded-full flex items-center justify-center">
                  <Twitter className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} {settings.companyName}. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const BundleDetailPage: React.FC = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  
  // Form per la richiesta del pacchetto
  const form = useForm<RequestBundleValues>({
    resolver: zodResolver(requestBundleSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      message: '',
    },
  });
  
  // Query per recuperare i dettagli del pacchetto
  const bundleQuery = useQuery({
    queryKey: [`/api/service-bundles/${id}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/service-bundles/${id}`);
        if (!res.ok) throw new Error('Errore nel caricamento del pacchetto');
        return await res.json();
      } catch (error) {
        console.error('Errore durante il recupero del pacchetto:', error);
        throw new Error('Errore nel caricamento del pacchetto');
      }
    }
  });
  
  // Query per recuperare gli elementi del pacchetto
  const bundleItemsQuery = useQuery({
    queryKey: [`/api/service-bundles/${id}/items`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/service-bundles/${id}/items`);
        if (!res.ok) throw new Error('Errore nel caricamento degli elementi del pacchetto');
        const items = await res.json();
        
        // Recuperare i dettagli completi di ogni servizio incluso nel pacchetto
        const itemsWithServices = await Promise.all(items.map(async (item: any) => {
          try {
            const serviceRes = await fetch(`/api/services/${item.serviceId}`);
            if (!serviceRes.ok) throw new Error(`Errore nel caricamento del servizio ${item.serviceId}`);
            const service = await serviceRes.json();
            return {
              ...item,
              service,
            };
          } catch (error) {
            console.error(`Errore durante il recupero del servizio ${item.serviceId}:`, error);
            // Restituisci un servizio di fallback in caso di errore
            return {
              ...item,
              service: {
                id: item.serviceId,
                name: "Servizio non disponibile",
                price: 0,
                description: "",
              },
            };
          }
        }));
        
        return itemsWithServices;
      } catch (error) {
        console.error('Errore durante il recupero degli elementi del pacchetto:', error);
        throw new Error('Errore nel caricamento degli elementi del pacchetto');
      }
    },
    enabled: !!bundleQuery.data,
  });
  
  // Query per recuperare le impostazioni dello studio
  const settingsQuery = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Errore nel caricamento delle impostazioni');
      return await res.json();
    }
  });
  
  // Mutation per inviare la richiesta del pacchetto
  const requestBundleMutation = useMutation({
    mutationFn: async (data: RequestBundleValues) => {
      // Aggiungi l'ID del bundle ai dati della richiesta
      const requestData = {
        ...data,
        bundleId: parseInt(id ?? '0'),
      };
      
      const res = await apiRequest('POST', '/api/bundle-leads', requestData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Richiesta inviata',
        description: 'La tua richiesta è stata inviata con successo. Ti contatteremo presto!',
      });
      setIsRequestDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Si è verificato un errore: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Gestore per l'apertura del dialog di richiesta
  const handleRequestBundle = () => {
    // Invece di aprire il dialogo, reindirizza alla nuova pagina di richiesta preventivo
    navigate(`/request-quote-from-bundle/${id}`);
  };
  
  // Gestore per l'invio del form di richiesta
  const onSubmit = (data: RequestBundleValues) => {
    requestBundleMutation.mutate(data);
  };
  
  // Se i dati sono in caricamento, mostra un indicatore di caricamento
  if (bundleQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // Se si è verificato un errore, mostra un messaggio di errore
  if (bundleQuery.error || settingsQuery.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
        <p className="text-gray-600 mb-6 text-center">
          Si è verificato un errore durante il caricamento dei dati. Riprova più tardi.
        </p>
        <Button onClick={() => navigate('/')}>
          Torna alla Home
        </Button>
      </div>
    );
  }
  
  // Se il pacchetto non esiste, mostra un messaggio appropriato
  if (!bundleQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Pacchetto non trovato</h1>
        <p className="text-gray-600 mb-6 text-center">
          Il pacchetto che stai cercando non esiste o è stato rimosso.
        </p>
        <Button onClick={() => navigate('/')}>
          Torna alla Home
        </Button>
      </div>
    );
  }
  
  // Prepara i dati per il rendering del template
  const bundle = {
    ...bundleQuery.data,
    items: bundleItemsQuery.data || [],
  };
  
  const settings = settingsQuery.data || {
    companyName: 'Studio Fotografico',
    companyEmail: 'info@studiofotografico.it',
  };
  
  // Seleziona il template in base allo stile del pacchetto
  const renderTemplate = () => {
    switch (bundle.templateStyle) {
      case 'modern':
        return <ModernTemplate bundle={bundle} settings={settings} onRequestBundle={handleRequestBundle} />;
      case 'minimal':
        return <MinimalTemplate bundle={bundle} settings={settings} onRequestBundle={handleRequestBundle} />;
      case 'bold':
        return <BoldTemplate bundle={bundle} settings={settings} onRequestBundle={handleRequestBundle} />;
      case 'elegant':
      default:
        return <ElegantTemplate bundle={bundle} settings={settings} onRequestBundle={handleRequestBundle} />;
    }
  };
  
  return (
    <>
      {renderTemplate()}
      
      {/* Dialog per richiedere il pacchetto */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Richiedi Questo Pacchetto</DialogTitle>
            <DialogDescription>
              Compila il form per richiedere un preventivo personalizzato basato su questo pacchetto.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Messaggio</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={requestBundleMutation.isPending}>
                  {requestBundleMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Invio in corso...
                    </span>
                  ) : 'Invia Richiesta'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BundleDetailPage;