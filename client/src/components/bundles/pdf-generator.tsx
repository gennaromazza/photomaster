import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import RequestSummary from './request-summary';
import { BundleLead, ServiceBundle } from '@shared/schema';

interface PdfGeneratorProps {
  lead: BundleLead & {
    bundle: ServiceBundle & {
      items: Array<{
        id: number;
        bundleId: number;
        serviceId: number;
        quantity: number;
        service: {
          id: number;
          name: string;
          price: number;
          description: string | null;
        };
      }>;
    };
  };
  settings: {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    companyLogo: string;
  } | null;
}

export default function PdfGenerator({ lead, settings }: PdfGeneratorProps) {
  const pdfRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!pdfRef.current) return;
    
    try {
      // Mostra un feedback all'utente
      const element = pdfRef.current;
      
      // Applica uno stile temporaneo per il rendering
      const originalStyle = element.style.cssText;
      element.style.width = '1024px';
      element.style.padding = '20px';
      element.style.backgroundColor = 'white';
      
      const canvas = await html2canvas(element, {
        scale: 2, // Migliora la qualità
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      // Ripristina lo stile originale
      element.style.cssText = originalStyle;
      
      const imgData = canvas.toDataURL('image/png');
      
      // Determina il formato della pagina in base al contenuto
      const contentWidth = canvas.width;
      const contentHeight = canvas.height;
      const ratio = contentHeight / contentWidth;
      
      // Crea un PDF A4 (210x297mm)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdfWidth * ratio;
      
      // Se il contenuto è più grande di una pagina A4, lo dividiamo in più pagine
      if (pdfHeight > pdf.internal.pageSize.getHeight()) {
        // Calcola il numero di pagine necessarie
        const numPages = Math.ceil(pdfHeight / pdf.internal.pageSize.getHeight());
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        for (let i = 0; i < numPages; i++) {
          // Aggiungi una nuova pagina dopo la prima
          if (i > 0) {
            pdf.addPage();
          }
          
          // Calcola quale parte dell'immagine mostrare in questa pagina
          const sourceY = i * pageHeight * canvas.height / pdfHeight;
          const sourceHeight = Math.min(
            canvas.height - sourceY,
            pageHeight * canvas.height / pdfHeight
          );
          
          pdf.addImage(
            imgData, 
            'PNG', 
            0, 
            0, 
            pdfWidth, 
            pdfHeight, 
            undefined, 
            'FAST',
            0,
            i * -pageHeight
          );
        }
      } else {
        // Se il contenuto si adatta a una pagina, lo aggiungiamo semplicemente
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      // Genera il nome del file
      const fileName = `Richiesta_Preventivo_${lead.firstName}_${lead.lastName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      
      // Scarica il PDF
      pdf.save(fileName);
    } catch (error) {
      console.error('Errore nella generazione del PDF:', error);
      alert('Si è verificato un errore durante la generazione del PDF. Riprova più tardi.');
    }
  };

  return (
    <div>
      <Button 
        onClick={generatePDF} 
        className="w-full my-4"
        variant="default"
      >
        <Download className="mr-2 h-4 w-4" />
        Scarica Riepilogo PDF
      </Button>
      
      {/* Contenitore nascosto per il rendering del PDF */}
      <div className="hidden">
        <div ref={pdfRef} className="pdf-content">
          <RequestSummary lead={lead} settings={settings} />
        </div>
      </div>
    </div>
  );
}