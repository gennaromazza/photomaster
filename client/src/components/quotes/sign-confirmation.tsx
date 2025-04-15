import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Heart, Camera, CalendarCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface SignConfirmationProps {
  clientName?: string;
  quoteTitle?: string;
}

const SignConfirmation = ({ clientName, quoteTitle }: SignConfirmationProps) => {
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
      description: "Una notifica è stata inviata al fotografo",
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
    hidden: { opacity: 0 },
    visible: (i: number) => ({ 
      opacity: 1,
      transition: { 
        delay: 0.8 + (i * 0.2),
        duration: 0.5
      }
    })
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f9f7f7] to-[#edf2f7] p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#9796f0] to-[#fbc7d4] p-1">
          <div className="bg-white rounded-lg p-8 relative overflow-hidden">
            {/* Icona di conferma */}
            <div className="flex justify-center mb-6">
              <motion.div
                className="h-20 w-20 bg-gradient-to-r from-indigo-500 to-pink-400 rounded-full flex items-center justify-center shadow-lg"
                variants={iconVariants}
                initial="hidden"
                animate="visible"
              >
                <Check className="text-white h-10 w-10" />
              </motion.div>
            </div>
            
            {/* Testo principale */}
            <motion.div
              className="text-center mb-8"
              variants={textVariants}
              initial="hidden"
              animate="visible"
            >
              <h1 className="text-3xl md:text-4xl font-playfair font-bold text-gray-800 mb-4">
                Grazie per la tua firma!
              </h1>
              <p className="text-lg text-gray-600 mb-2">
                {clientName ? `Caro/a ${clientName},` : 'Gentile cliente,'} il tuo contratto 
                {quoteTitle ? ` per "${quoteTitle}"` : ''} è stato firmato con successo.
              </p>
              <p className="text-md text-gray-600">
                Ti contatteremo presto per i prossimi passi. Una copia del contratto sarà inviata alla tua email.
              </p>
            </motion.div>
            
            {/* Elementi decorativi */}
            <div className="relative h-24">
              <motion.div 
                className="absolute left-1/4 top-0"
                custom={0}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <Camera className="h-8 w-8 text-indigo-400" />
              </motion.div>
              <motion.div 
                className="absolute left-1/2 top-6"
                custom={1}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <Heart className="h-8 w-8 text-pink-400" />
              </motion.div>
              <motion.div 
                className="absolute right-1/4 top-2"
                custom={2}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <CalendarCheck className="h-8 w-8 text-purple-400" />
              </motion.div>
              <motion.div 
                className="absolute right-10 top-10"
                custom={3}
                variants={decorationVariants}
                initial="hidden"
                animate="visible"
              >
                <Sparkles className="h-8 w-8 text-yellow-400" />
              </motion.div>
            </div>
            
            {/* Coriandoli animati */}
            {activeConfetti && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 50 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `-${Math.random() * 20}%`,
                      backgroundColor: `hsl(${Math.random() * 360}, 70%, 70%)`,
                    }}
                    variants={confettiVariants}
                    initial="hidden"
                    animate={{
                      y: ['0%', '1500%'],
                      x: [
                        `${Math.random() * 10 - 5}%`,
                        `${Math.random() * 20 - 10}%`,
                        `${Math.random() * 10 - 5}%`
                      ],
                      opacity: [1, 0.8, 0.6, 0.4, 0],
                      rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)]
                    }}
                    transition={{
                      duration: 2 + Math.random() * 4,
                      delay: Math.random(),
                      repeat: Infinity,
                      repeatType: "loop" as const,
                      ease: "linear",
                      y: {
                        duration: 4 + Math.random() * 2,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "linear"
                      }
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Pulsante per tornare alla home */}
            <div className="flex justify-center mt-8">
              <Link href="/">
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-8 py-2 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105">
                  Torna alla Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignConfirmation;