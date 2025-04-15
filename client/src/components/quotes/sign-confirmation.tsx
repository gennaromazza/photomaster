import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Camera, 
  Mail, 
  BookHeart, 
  Sparkles, 
  GalleryVertical,
  FlowerIcon, 
  Leaf, 
  Wine,
  HeartHandshake
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface SignConfirmationProps {
  clientName?: string;
  quoteTitle?: string;
  clientEmail?: string;
}

const SignConfirmation = ({ clientName, quoteTitle, clientEmail }: SignConfirmationProps) => {
  const { toast } = useToast();
  const [activeConfetti, setActiveConfetti] = useState(false);
  
  useEffect(() => {
    // Imposta un ritardo per l'animazione dei coriandoli
    const timer = setTimeout(() => {
      setActiveConfetti(true);
    }, 500);
    
    // Mostra un toast di conferma
    toast({
      title: "Contratto firmato con successo!",
      description: "Una notifica è stata inviata allo studio fotografico",
      variant: "default",
      className: "bg-green-50 border-green-200 text-green-800",
    });
    
    return () => clearTimeout(timer);
  }, [toast]);
  
  // Animazione per il testo principale
  const textVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.8,
        ease: "easeOut" 
      }
    }
  };
  
  // Animazione per i coriandoli
  const confettiVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.5,
        delay: 0.3
      }
    }
  };
  
  // Animazione per l'icona
  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: { 
        type: "spring", 
        stiffness: 260, 
        damping: 20,
        delay: 0.1
      }
    }
  };
  
  // Animazione per gli elementi grafici decorativi
  const decorationVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: (i: number) => ({ 
      opacity: 1,
      scale: 1,
      transition: { 
        delay: 0.8 + (i * 0.2),
        duration: 0.7,
        type: "spring",
        bounce: 0.4
      }
    })
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f9f5f1] p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* Bordo decorativo stile vintage */}
        <div className="p-1 bg-[#e9ddc8]">
          <div className="bg-white border-2 border-[#e2d5bb] rounded-lg p-8 relative overflow-hidden">
            {/* Decorazione vintage in alto */}
            <div className="absolute top-0 left-0 w-full h-8 opacity-10">
              <div className="w-full h-full bg-repeat-x" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 0-10-1.007-10-10z' fill='%23a28e72' fill-opacity='0.7' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                backgroundSize: '20px 20px'
              }}></div>
            </div>
            
            {/* Icona di conferma */}
            <div className="flex justify-center mb-8 mt-4">
              <motion.div
                className="h-24 w-24 bg-[#e2d5bb] rounded-full flex items-center justify-center shadow-md border-4 border-[#f2ebe0]"
                variants={iconVariants}
                initial="hidden"
                animate="visible"
              >
                <HeartHandshake className="text-[#826c4e] h-12 w-12" />
              </motion.div>
            </div>
            
            {/* Testo principale */}
            <motion.div
              className="text-center mb-8"
              variants={textVariants}
              initial="hidden"
              animate="visible"
            >
              <h1 className="text-3xl md:text-4xl font-playfair font-bold text-[#72604a] mb-6 tracking-wide">
                Grazie per la tua firma!
              </h1>
              <p className="text-lg text-[#72604a] mb-3 font-light">
                {clientName ? `Caro/a ${clientName},` : 'Gentile cliente,'} il tuo contratto 
                {quoteTitle ? ` per "${quoteTitle}"` : ''} è stato firmato con successo.
              </p>
              <div className="py-4 px-6 bg-[#f9f5f1] rounded-lg border border-[#e9ddc8] mb-3">
                <div className="flex items-center justify-center mb-2">
                  <Mail className="text-[#a28e72] h-5 w-5 mr-2" />
                  <span className="text-[#72604a] font-medium">Conferma via Email</span>
                </div>
                <p className="text-md text-[#8a7760]">
                  Una email di conferma è stata inviata al tuo indirizzo{clientEmail ? ` (${clientEmail})` : ''}. 
                  Riceverai anche una copia del contratto firmato.
                </p>
              </div>
              <p className="text-md text-[#8a7760] italic">
                Il nostro team ti contatterà presto per i prossimi passi.
              </p>
            </motion.div>
            
            {/* Elementi decorativi in stile country vintage */}
            <div className="relative h-32">
              <motion.div 
                className="absolute left-[20%] top-0"
                custom={0}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <Camera className="h-10 w-10 text-[#bd9b76]" />
              </motion.div>
              <motion.div 
                className="absolute left-[40%] top-8"
                custom={1}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <FlowerIcon className="h-8 w-8 text-[#c7a987]" />
              </motion.div>
              <motion.div 
                className="absolute left-[60%] top-3"
                custom={2}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <GalleryVertical className="h-9 w-9 text-[#bb9c7c]" />
              </motion.div>
              <motion.div 
                className="absolute left-[80%] top-10"
                custom={3}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <Wine className="h-8 w-8 text-[#c8aa88]" />
              </motion.div>
              <motion.div 
                className="absolute left-[30%] top-20"
                custom={4}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <Leaf className="h-7 w-7 text-[#b6997a]" />
              </motion.div>
              <motion.div 
                className="absolute left-[70%] top-16"
                custom={5}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <BookHeart className="h-7 w-7 text-[#a58d6f]" />
              </motion.div>
              <motion.div 
                className="absolute left-[10%] top-16"
                custom={6}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <Sparkles className="h-8 w-8 text-[#d4b696]" />
              </motion.div>
            </div>
            
            {/* Effetto coriandoli più elegante e dorato */}
            {activeConfetti && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 40 }).map((_, i) => {
                  // Colori in tema matrimonio country vintage
                  const colors = [
                    '#d4b696', '#c8aa88', '#a58d6f', '#9c8369', 
                    '#e2d5bb', '#f3eadd', '#eee2cf'
                  ];
                  const color = colors[Math.floor(Math.random() * colors.length)];
                  
                  // Forme diverse: cerchi, rettangoli, petali
                  const shapes = ["circle", "rect", "petal"];
                  const shape = shapes[Math.floor(Math.random() * shapes.length)];
                  
                  return (
                    <motion.div
                      key={i}
                      className={`absolute ${
                        shape === "circle" ? "rounded-full" : 
                        shape === "rect" ? "rounded-sm" : 
                        "rounded-full"
                      }`}
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `-${Math.random() * 20}%`,
                        backgroundColor: color,
                        width: shape === "petal" ? '6px' : `${3 + Math.random() * 4}px`,
                        height: shape === "petal" ? '12px' : shape === "rect" ? `${2 + Math.random() * 6}px` : `${3 + Math.random() * 4}px`,
                        opacity: 0.8,
                      }}
                      variants={confettiVariants}
                      initial="hidden"
                      animate={{
                        y: ['0%', '1200%'],
                        x: [
                          `${Math.random() * 10 - 5}%`,
                          `${Math.random() * 30 - 15}%`,
                          `${Math.random() * 10 - 5}%`
                        ],
                        opacity: [0.9, 0.8, 0.6, 0.3, 0],
                        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)]
                      }}
                      transition={{
                        duration: 4 + Math.random() * 3,
                        delay: Math.random() * 1.5,
                        repeat: Infinity,
                        repeatType: "loop" as const,
                        ease: "easeInOut",
                      }}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Pulsante per tornare alla home in stile country vintage */}
            <div className="flex justify-center mt-6">
              <Link href="/">
                <Button className="bg-[#a28e72] hover:bg-[#8a7760] text-white border border-[#c8b393] shadow-md px-8 py-6 rounded-md font-playfair text-lg tracking-wide transform transition-all duration-300 hover:scale-105">
                  Torna alla Home
                </Button>
              </Link>
            </div>
            
            {/* Decorazione vintage in basso */}
            <div className="absolute bottom-0 left-0 w-full h-8 opacity-10 transform rotate-180">
              <div className="w-full h-full bg-repeat-x" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 0-10-1.007-10-10z' fill='%23a28e72' fill-opacity='0.7' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                backgroundSize: '20px 20px'
              }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignConfirmation;