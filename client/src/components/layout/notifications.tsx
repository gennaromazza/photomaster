import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: 'quote_signed' | 'payment_received' | 'event_reminder' | 'system';
  title: string;
  message: string;
  link?: string;
  createdAt: string | Date;
  read: boolean;
}

export default function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Query per ottenere le notifiche
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) throw new Error('Errore nel caricamento delle notifiche');
        return await res.json();
      } catch (error) {
        console.error("Errore nel caricamento delle notifiche:", error);
        return [];
      }
    },
    // Aggiorna le notifiche ogni minuto
    refetchInterval: 60 * 1000,
  });
  
  const queryClient = useQueryClient();
  
  // Conteggio notifiche non lette
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Funzione per segnare una notifica come letta
  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Aggiorna la cache delle notifiche
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      console.error("Errore nell'aggiornamento della notifica:", error);
      toast({
        title: "Errore",
        description: "Impossibile segnare la notifica come letta",
        variant: "destructive",
      });
    }
  };
  
  // Funzione per segnare tutte le notifiche come lette
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      
      // Aggiorna la cache delle notifiche
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      console.error("Errore nell'aggiornamento delle notifiche:", error);
      toast({
        title: "Errore",
        description: "Impossibile segnare tutte le notifiche come lette",
        variant: "destructive",
      });
    }
  };
  
  // Ottieni icona per il tipo di notifica
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'quote_signed':
        return <i className="ri-file-text-line text-green-600"></i>;
      case 'payment_received':
        return <i className="ri-money-euro-circle-line text-blue-600"></i>;
      case 'event_reminder':
        return <i className="ri-calendar-event-line text-amber-600"></i>;
      case 'system':
      default:
        return <i className="ri-information-line text-gray-600"></i>;
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h3 className="font-medium">Notifiche</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground"
              onClick={markAllAsRead}
            >
              Segna tutte come lette
            </Button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <i className="ri-notification-line text-2xl mb-2"></i>
              <p>Nessuna notifica</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onRead={() => markAsRead(notification.id)}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  onClose: () => void;
}

function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  // Converti string in Date se necessario
  const createdAt = typeof notification.createdAt === 'string' 
    ? new Date(notification.createdAt) 
    : notification.createdAt;
  
  // Formatta la data in modo relativo (oggi, ieri, o data completa)
  const formattedDate = format(createdAt, 'dd MMM yyyy, HH:mm', { locale: it });
  
  const handleClick = () => {
    if (!notification.read) {
      onRead();
    }
    if (notification.link) {
      onClose(); // Chiudi il popover prima di navigare
    }
  };
  
  // Contenuto del componente
  const content = (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-0",
        !notification.read && "bg-muted/20"
      )}
      onClick={handleClick}
    >
      <div className="mt-1">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium", !notification.read && "font-semibold")}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{notification.message}</p>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>
    </div>
  );
  
  // Se c'è un link, wrappa con Link, altrimenti mostra solo il contenuto
  return notification.link ? (
    <Link href={notification.link}>
      {content}
    </Link>
  ) : (
    content
  );
}

// Funzione helper per ottenere l'icona del tipo di notifica
function getNotificationIcon(type: string) {
  switch (type) {
    case 'quote_signed':
      return <i className="ri-file-text-line text-green-600"></i>;
    case 'payment_received':
      return <i className="ri-money-euro-circle-line text-blue-600"></i>;
    case 'event_reminder':
      return <i className="ri-calendar-event-line text-amber-600"></i>;
    case 'system':
    default:
      return <i className="ri-information-line text-gray-600"></i>;
  }
}