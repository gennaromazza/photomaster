import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ServiceBundle, BundleLead } from '@shared/schema';

interface RequestSummaryProps {
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

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Data non specificata';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy', { locale: it });
  } catch (error) {
    console.error('Errore nella formattazione della data:', error);
    return 'Data non valida';
  }
}

export default function RequestSummary({ lead, settings }: RequestSummaryProps) {
  const fullName = `${lead.firstName} ${lead.lastName}`;
  const eventDate = formatDate(lead.bundle?.eventDate || null);
  const requestDate = formatDate(lead.createdAt);
  
  // Calcola il totale del pacchetto
  const totalAmount = lead.bundle?.items?.reduce((sum, item) => {
    return sum + ((item.service?.price || 0) * item.quantity);
  }, 0) || 0;
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Riepilogo Richiesta Preventivo</h1>
        <p className="text-lg text-gray-600">
          {settings?.companyName || 'Studio Fotografico'}
        </p>
      </div>
      
      <div className="border rounded-lg p-6 mb-8 bg-white">
        <h2 className="text-xl font-semibold border-b pb-2 mb-4">Informazioni Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium">Nome Completo:</p>
            <p>{fullName}</p>
          </div>
          <div>
            <p className="font-medium">Email:</p>
            <p>{lead.email}</p>
          </div>
          <div>
            <p className="font-medium">Telefono:</p>
            <p>{lead.phone || 'Non specificato'}</p>
          </div>
          <div>
            <p className="font-medium">Data Richiesta:</p>
            <p>{requestDate}</p>
          </div>
        </div>
      </div>
      
      <div className="border rounded-lg p-6 mb-8 bg-white">
        <h2 className="text-xl font-semibold border-b pb-2 mb-4">Dettagli Pacchetto</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="font-medium">Nome Pacchetto:</p>
            <p>{lead.bundle?.name || 'Pacchetto non specificato'}</p>
          </div>
          <div>
            <p className="font-medium">Tipo Evento:</p>
            <p>{lead.bundle?.eventType || 'Non specificato'}</p>
          </div>
          <div>
            <p className="font-medium">Data Evento:</p>
            <p>{eventDate}</p>
          </div>
          <div>
            <p className="font-medium">Location:</p>
            <p>{lead.bundle?.location || 'Non specificata'}</p>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Descrizione Pacchetto:</h3>
          <p className="text-gray-700 whitespace-pre-line">
            {lead.bundle?.description || 'Nessuna descrizione disponibile'}
          </p>
        </div>
      </div>
      
      <div className="border rounded-lg p-6 mb-8 bg-white">
        <h2 className="text-xl font-semibold border-b pb-2 mb-4">Servizi Inclusi</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Servizio</th>
                <th className="px-4 py-2 text-left">Descrizione</th>
                <th className="px-4 py-2 text-right">Prezzo</th>
                <th className="px-4 py-2 text-right">Quantità</th>
                <th className="px-4 py-2 text-right">Totale</th>
              </tr>
            </thead>
            <tbody>
              {lead.bundle?.items?.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-2">{item.service?.name || 'Servizio non disponibile'}</td>
                  <td className="px-4 py-2">{item.service?.description || '-'}</td>
                  <td className="px-4 py-2 text-right">€{(item.service?.price || 0).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-right">€{((item.service?.price || 0) * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td colSpan={4} className="px-4 py-2 text-right">Totale Pacchetto:</td>
                <td className="px-4 py-2 text-right">€{totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {lead.message && (
        <div className="border rounded-lg p-6 mb-8 bg-white">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Messaggio Cliente</h2>
          <div className="whitespace-pre-line">
            {lead.message}
          </div>
        </div>
      )}
      
      <div className="mt-8 text-center text-sm text-gray-600">
        <p>Questa è una richiesta di preventivo. Il preventivo definitivo sarà inviato dallo studio.</p>
        <p className="mt-2">
          Per qualsiasi informazione, contattaci a: {settings?.companyEmail || 'info@studiofotografico.it'}
        </p>
        <p className="mt-1">
          Telefono: {settings?.companyPhone || 'Non disponibile'}
        </p>
        <p className="mt-6">
          Documento generato il {format(new Date(), 'dd/MM/yyyy', { locale: it })}
        </p>
      </div>
    </div>
  );
}