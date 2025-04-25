import React from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BundleLead, ServiceBundle } from '@shared/schema';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatDate } from './request-summary';

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
  // Versione più semplice del generatore PDF senza html2canvas
  const generatePDF = async () => {
    try {
      // Prepara i dati
      const fullName = `${lead.firstName} ${lead.lastName}`;
      const eventDate = formatDate(lead.bundle?.eventDate || null);
      const requestDate = formatDate(lead.createdAt);
      
      // Calcola il totale del pacchetto
      const totalAmount = lead.bundle?.items?.reduce((sum, item) => {
        return sum + ((item.service?.price || 0) * item.quantity);
      }, 0) || 0;

      // Crea un nuovo documento PDF (orientamento portrait, unità in millimetri, formato A4)
      const pdf = new jsPDF();
      
      // Impostazioni per il testo
      const lineHeight = 8;
      let y = 20; // posizione verticale iniziale
      
      // Funzione di utilità per aggiungere testo
      const addText = (text: string, fontSize = 12, isBold = false, align = 'left') => {
        pdf.setFontSize(fontSize);
        isBold ? pdf.setFont('helvetica', 'bold') : pdf.setFont('helvetica', 'normal');
        pdf.text(text, align === 'center' ? 105 : align === 'right' ? 200 : 20, y, { align });
        y += lineHeight;
      };
      
      // Aggiungi intestazione
      addText(settings?.companyName || 'Studio Fotografico', 16, true, 'center');
      y += 5;
      addText('Riepilogo Richiesta Preventivo', 14, true, 'center');
      y += 10;
      
      // Informazioni cliente
      addText('Informazioni Cliente', 14, true);
      pdf.line(20, y, 190, y);
      y += 10;
      
      addText(`Nome: ${fullName}`, 12);
      addText(`Email: ${lead.email}`, 12);
      addText(`Telefono: ${lead.phone || 'Non specificato'}`, 12);
      addText(`Data Richiesta: ${requestDate}`, 12);
      y += 5;
      
      // Dettagli pacchetto
      addText('Dettagli Pacchetto', 14, true);
      pdf.line(20, y, 190, y);
      y += 10;
      
      addText(`Nome Pacchetto: ${lead.bundle?.name || 'Pacchetto non specificato'}`, 12);
      addText(`Tipo Evento: ${lead.bundle?.eventType || 'Non specificato'}`, 12);
      addText(`Data Evento: ${eventDate}`, 12);
      addText(`Location: ${lead.bundle?.location || 'Non specificata'}`, 12);
      y += 5;
      
      // Descrizione
      if (lead.bundle?.description) {
        addText('Descrizione:', 12, true);
        const descriptionLines = pdf.splitTextToSize(lead.bundle.description, 170);
        pdf.text(descriptionLines, 20, y);
        y += descriptionLines.length * lineHeight + 5;
      }
      
      // Servizi inclusi
      addText('Servizi Inclusi', 14, true);
      pdf.line(20, y, 190, y);
      y += 10;
      
      // Tabella dei servizi
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Servizio', 20, y);
      pdf.text('Prezzo', 130, y);
      pdf.text('Qtà', 150, y);
      pdf.text('Totale', 170, y);
      y += 6;
      
      pdf.line(20, y, 190, y);
      y += 5;
      
      // Righe della tabella
      if (lead.bundle?.items?.length) {
        pdf.setFont('helvetica', 'normal');
        for (const item of lead.bundle.items) {
          const servicePrice = item.service?.price || 0;
          const serviceTotal = servicePrice * item.quantity;
          const serviceName = item.service?.name || 'Servizio non disponibile';
          
          pdf.text(serviceName, 20, y);
          pdf.text(`€${servicePrice.toFixed(2)}`, 130, y);
          pdf.text(`${item.quantity}`, 150, y);
          pdf.text(`€${serviceTotal.toFixed(2)}`, 170, y);
          y += 7;
        }
      } else {
        pdf.text('Nessun servizio incluso nel pacchetto', 20, y);
        y += 7;
      }
      
      // Linea di separazione
      pdf.line(20, y, 190, y);
      y += 6;
      
      // Totale
      pdf.setFont('helvetica', 'bold');
      pdf.text('Totale Pacchetto:', 130, y);
      pdf.text(`€${totalAmount.toFixed(2)}`, 170, y);
      y += 15;
      
      // Messaggio del cliente
      if (lead.message) {
        addText('Messaggio Cliente:', 12, true);
        const messageLines = pdf.splitTextToSize(lead.message, 170);
        pdf.setFont('helvetica', 'normal');
        pdf.text(messageLines, 20, y);
        y += messageLines.length * lineHeight + 10;
      }
      
      // Note a piè di pagina
      y = 270; // Posizione fissa per il piè di pagina
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Questa è una richiesta di preventivo. Il preventivo definitivo sarà inviato dallo studio.', 20, y);
      y += 5;
      pdf.text(`Per informazioni: ${settings?.companyEmail || 'info@studiofotografico.it'} - ${settings?.companyPhone || 'Non disponibile'}`, 20, y);
      y += 5;
      pdf.text(`Documento generato il ${format(new Date(), 'dd/MM/yyyy', { locale: it })}`, 20, y);
      
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
    </div>
  );
}