import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useQuery } from "@tanstack/react-query";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, parseISO, isSameDay, addDays, startOfWeek, endOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Event, Client, Collaborator, Quote, insertEventSchema } from "@shared/schema";
import { CreateEventForm, CreateAppointmentForm } from "@/components/calendar";
import { Link } from "wouter";

// Tipo personalizzato per rappresentare i preventivi nel calendario
type QuoteCalendarItem = {
  id: string;
  title: string;
  eventType: string;
  date: Date;
  isQuote: true;
  status: string;
};

// Tipo di unione per rappresentare sia eventi che preventivi nel calendario
type CalendarItem = Event | QuoteCalendarItem;

const weekdays = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];

// Function to adjust the day for the Italian locale (Monday is 1)
function getAdjustedDay(date: Date): number {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1; // Convert Sunday (0) to 6, and shift other days
}

const CalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ day: Date, events: CalendarItem[] } | null>(null);
  
  const { data: events = [], isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const { data: collaborators = [], isLoading: isLoadingCollaborators } = useQuery<Collaborator[]>({
    queryKey: ["/api/collaborators"],
  });
  
  const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });
  
  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Get all days in month
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Calculate the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const startDay = getAdjustedDay(monthStart);
  
  // Add days from previous month to fill the start of the calendar
  const prevMonthDays = Array.from({ length: startDay }, (_, i) => 
    new Date(monthStart.getFullYear(), monthStart.getMonth(), -startDay + i + 1)
  );
  
  // Add days from next month to complete the calendar grid
  const totalDaysToShow = Math.ceil((days.length + startDay) / 7) * 7;
  const nextMonthDays = Array.from(
    { length: totalDaysToShow - days.length - startDay },
    (_, i) => new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + i + 1)
  );
  
  // Combine all days
  const calendarDays = [...prevMonthDays, ...days, ...nextMonthDays];
  
  // Function to get events for a specific day
  // Funzione per determinare se un preventivo ha una data evento associata
  const getQuotesForDay = (day: Date) => {
    return quotes.filter(quote => {
      if (!quote.eventDate) return false;
      const quoteEventDate = new Date(quote.eventDate);
      return quoteEventDate.getDate() === day.getDate() && 
             quoteEventDate.getMonth() === day.getMonth() && 
             quoteEventDate.getFullYear() === day.getFullYear();
    });
  };

  // Funzione per ottenere tutti gli eventi per un giorno specifico
  const getEventsForDay = (day: Date): CalendarItem[] => {
    // Primo recuperiamo gli eventi standard
    const dayEvents = events.filter(event => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day.getDate() && 
             eventDate.getMonth() === day.getMonth() && 
             eventDate.getFullYear() === day.getFullYear();
    });
    
    // Rimuoviamo possibili eventi duplicati usando l'ID
    const uniqueEvents = dayEvents.reduce<Event[]>((acc, event) => {
      if (!acc.some(e => e.id === event.id)) {
        acc.push(event);
      }
      return acc;
    }, []);
    
    // Poi recuperiamo i preventivi con data evento impostata
    const dayQuotes = getQuotesForDay(day);
    
    // Rimuoviamo preventivi duplicati
    const uniqueQuotes = dayQuotes.reduce<Quote[]>((acc, quote) => {
      if (!acc.some(q => q.id === quote.id)) {
        acc.push(quote);
      }
      return acc;
    }, []);
    
    // Creiamo gli elementi di calendario dai preventivi
    const quoteCalendarItems: QuoteCalendarItem[] = uniqueQuotes.map(quote => ({
      id: `quote-${quote.id}`,
      title: quote.title || "Preventivo senza titolo",
      eventType: quote.eventType || "quote",
      date: new Date(quote.eventDate!),
      isQuote: true,
      status: quote.status === "signed" ? "signed" : "draft"
    }));
    
    // Combiniamo tutto in un unico array
    return [...uniqueEvents, ...quoteCalendarItems];
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsCreateEventOpen(true);
  };
  
  const handleCreateEventSuccess = () => {
    setIsCreateEventOpen(false);
    setSelectedDate(null);
  };
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">Calendario</h1>
          <p className="mt-1 text-gray-500">Visualizza e gestisci i tuoi eventi</p>
        </div>
        <div className="mt-4 lg:mt-0 flex items-center space-x-3">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "month" | "agenda")}>
            <ToggleGroupItem value="month" aria-label="Vista Mese">
              <i className="ri-calendar-line mr-1"></i>
              Mese
            </ToggleGroupItem>
            <ToggleGroupItem value="agenda" aria-label="Vista Agenda">
              <i className="ri-list-check-2 mr-1"></i>
              Agenda
            </ToggleGroupItem>
          </ToggleGroup>
          <Link href="/events/new">
            <Button className="inline-flex items-center">
              <i className="ri-add-line mr-2"></i>
              Nuovo Evento
            </Button>
          </Link>
        </div>
      </div>
      
      <Card className="overflow-hidden mb-8">
        <CardHeader className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-display font-medium">Calendario Eventi</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                onClick={handlePreviousMonth}
              >
                <i className="ri-arrow-left-s-line"></i>
              </Button>
              <span className="text-sm text-gray-700 font-medium">
                {format(currentMonth, "MMMM yyyy", { locale: it })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                onClick={handleNextMonth}
              >
                <i className="ri-arrow-right-s-line"></i>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {viewMode === "month" ? (
            <>
              {/* Vista Mese - Griglia Calendario */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {weekdays.map((day, index) => (
                  <div key={index} className="text-xs text-gray-500 font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = isToday(day);
                  const dayEvents = getEventsForDay(day);
                  
                  return (
                    <div 
                      key={index}
                      onClick={() => handleDayClick(day)} 
                      className={cn(
                        "min-h-[80px] p-1 border border-gray-100 rounded-md cursor-pointer transition-colors hover:bg-gray-50 relative group",
                        isSelected && "bg-primary-light/5",
                        isCurrentMonth ? "bg-white" : "bg-gray-50/50"
                      )}
                    >
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer transition-opacity">
                        <i className="ri-add-line text-xs"></i>
                      </div>
                      <div className={cn(
                        "text-xs",
                        !isCurrentMonth && "text-gray-400",
                        isSelected && "font-medium text-primary"
                      )}>
                        {format(day, "d")}
                      </div>
                      
                      {/* Mostriamo fino a 3 eventi per giorno */}
                      {dayEvents.slice(0, 3).map((event, eventIndex) => {
                        // Verifichiamo se l'elemento è un preventivo usando typeguard
                        const isQuoteItem = (item: CalendarItem): item is QuoteCalendarItem => 
                          'isQuote' in item && item.isQuote === true;
                        
                        // Determina il link corretto in base al tipo di elemento (preventivo o evento)
                        const linkPath = isQuoteItem(event)
                          ? `/quotes/${event.id.toString().replace('quote-', '')}` 
                          : `/events/${event.id}`;
                        
                        // Determina la classe di stile in base al tipo di elemento e allo stato
                        const eventClass = cn(
                          "mt-1 p-1 text-xs rounded truncate flex items-center",
                          isQuoteItem(event)
                            ? (event.status === "signed" 
                                ? "bg-purple-100 text-purple-800" 
                                : "bg-amber-100 text-amber-800")
                            : event.eventType === "wedding" 
                                ? "bg-accent-light text-accent-dark" 
                                : event.eventType === "appointment" 
                                    ? "bg-blue-100 text-blue-800" 
                                    : "bg-green-100 text-green-800"
                        );
                        
                        // Aggiungi un'icona per identificare rapidamente il tipo di elemento
                        const eventIcon = isQuoteItem(event)
                          ? <i className="ri-file-list-line mr-1 text-xs"></i>
                          : <i className="ri-calendar-event-line mr-1 text-xs"></i>;
                        
                        return (
                          <Link key={eventIndex} href={linkPath}>
                            <div className={eventClass}>
                              {eventIcon}
                              <span className="truncate">{event.title}</span>
                            </div>
                          </Link>
                        );
                      })}
                      
                      {/* Se ci sono più di 3 eventi, mostriamo un indicatore */}
                      {dayEvents.length > 3 && (
                        <div
                          className="mt-1 text-xs text-gray-500 text-center cursor-pointer hover:text-primary-dark transition-colors"
                          onClick={(e) => {
                            e.stopPropagation(); // Evita di aprire il dialog per creare un evento
                            setSelectedDayEvents({ day, events: dayEvents });
                          }}
                        >
                          +{dayEvents.length - 3} altri
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Vista Agenda */
            <div className="divide-y divide-gray-100">
              {/* Ottieni solo i giorni del mese corrente per l'agenda */}
              {days.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                
                // Mostra solo i giorni che hanno eventi
                if (dayEvents.length === 0) return null;
                
                return (
                  <div key={index} className="py-4">
                    <div className="flex items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center mr-4",
                        isToday(day) ? "bg-primary text-white font-medium" : "bg-gray-100 text-gray-700"
                      )}>
                        {format(day, "d")}
                      </div>
                      <div>
                        <h3 className="font-medium">{format(day, "EEEE d MMMM", { locale: it })}</h3>
                        <p className="text-sm text-gray-500">{dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventi'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 pl-14 space-y-2">
                      {dayEvents.map((event, eventIndex) => {
                        // Verifichiamo se l'elemento è un preventivo usando typeguard
                        const isQuoteItem = (item: CalendarItem): item is QuoteCalendarItem => 
                          'isQuote' in item && item.isQuote === true;
                        
                        // Determina il link corretto in base al tipo di elemento (preventivo o evento)
                        const linkPath = isQuoteItem(event)
                          ? `/quotes/${event.id.toString().replace('quote-', '')}` 
                          : `/events/${event.id}`;
                        
                        // Determina la classe di stile in base al tipo di elemento e allo stato
                        const eventClass = cn(
                          "p-2 rounded flex items-center justify-between hover:bg-gray-50 transition-colors border-l-4",
                          isQuoteItem(event)
                            ? (event.status === "signed" 
                                ? "border-purple-500 bg-purple-50" 
                                : "border-amber-500 bg-amber-50")
                            : event.eventType === "wedding" 
                                ? "border-accent bg-accent-light/20" 
                                : event.eventType === "appointment" 
                                    ? "border-blue-500 bg-blue-50" 
                                    : "border-green-500 bg-green-50"
                        );
                        
                        // Aggiungi un'icona per identificare rapidamente il tipo di elemento
                        const eventIcon = isQuoteItem(event)
                          ? <i className="ri-file-list-line mr-2"></i>
                          : <i className="ri-calendar-event-line mr-2"></i>;
                        
                        return (
                          <Link key={eventIndex} href={linkPath}>
                            <div className={eventClass}>
                              <div className="flex items-center">
                                {eventIcon}
                                <span className="font-medium">{event.title}</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {isQuoteItem(event) 
                                  ? event.status === "signed" ? "Preventivo firmato" : "Preventivo"
                                  : event.eventType === "wedding" ? "Matrimonio" : 
                                    event.eventType === "appointment" ? "Appuntamento" : 
                                    "Evento"
                                }
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* Messaggio se non ci sono eventi */}
              {days.every(day => getEventsForDay(day).length === 0) && (
                <div className="py-8 text-center">
                  <div className="text-gray-400 mb-2">
                    <i className="ri-calendar-line text-4xl"></i>
                  </div>
                  <p className="text-gray-500">Nessun evento in questo mese</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog per creare un nuovo evento */}
      <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Nuovo Elemento Calendario</DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <span>Data selezionata: {format(selectedDate, "d MMMM yyyy", { locale: it })}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDate && (
            <Tabs defaultValue="appointment" className="mt-2">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="appointment">Appuntamento</TabsTrigger>
                <TabsTrigger value="event">Evento Completo</TabsTrigger>
              </TabsList>
              
              <TabsContent value="appointment" className="pt-4">
                <CreateAppointmentForm 
                  selectedDate={selectedDate} 
                  clients={clients} 
                  collaborators={collaborators}
                  quotes={quotes}
                  onSuccess={handleCreateEventSuccess}
                />
              </TabsContent>
              
              <TabsContent value="event" className="pt-4">
                <CreateEventForm 
                  selectedDate={selectedDate} 
                  clients={clients} 
                  collaborators={collaborators}
                  onSuccess={handleCreateEventSuccess}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog per mostrare tutti gli eventi di un giorno */}
      <Dialog open={!!selectedDayEvents} onOpenChange={(open) => !open && setSelectedDayEvents(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedDayEvents && (
                <span>Eventi del {format(selectedDayEvents.day, "d MMMM yyyy", { locale: it })}</span>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedDayEvents && (
                <span>{selectedDayEvents.events.length} {selectedDayEvents.events.length === 1 ? 'evento' : 'eventi'} in questa data</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDayEvents && (
            <div className="space-y-3 max-h-96 overflow-auto py-2">
              {selectedDayEvents.events.map((event, index) => {
                // Verifichiamo se l'elemento è un preventivo usando typeguard
                const isQuoteItem = (item: CalendarItem): item is QuoteCalendarItem => 
                  'isQuote' in item && item.isQuote === true;
                
                // Determina il link corretto in base al tipo di elemento (preventivo o evento)
                const linkPath = isQuoteItem(event)
                  ? `/quotes/${event.id.toString().replace('quote-', '')}` 
                  : `/events/${event.id}`;
                
                // Determina la classe di stile in base al tipo di elemento e allo stato
                const eventClass = cn(
                  "p-3 rounded flex items-center justify-between hover:bg-gray-50 transition-colors border-l-4",
                  isQuoteItem(event)
                    ? (event.status === "signed" 
                        ? "border-purple-500 bg-purple-50" 
                        : "border-amber-500 bg-amber-50")
                    : event.eventType === "wedding" 
                        ? "border-accent bg-accent-light/20" 
                        : event.eventType === "appointment" 
                            ? "border-blue-500 bg-blue-50" 
                            : "border-green-500 bg-green-50"
                );
                
                // Aggiungi un'icona per identificare rapidamente il tipo di elemento
                const eventIcon = isQuoteItem(event)
                  ? <i className="ri-file-list-line mr-2"></i>
                  : <i className="ri-calendar-event-line mr-2"></i>;
                
                return (
                  <Link key={index} href={linkPath} onClick={() => setSelectedDayEvents(null)}>
                    <div className={eventClass}>
                      <div className="flex items-center">
                        {eventIcon}
                        <span className="font-medium">{event.title}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {isQuoteItem(event) 
                          ? event.status === "signed" ? "Preventivo firmato" : "Preventivo"
                          : event.eventType === "wedding" ? "Matrimonio" : 
                            event.eventType === "appointment" ? "Appuntamento" : 
                            "Evento"
                        }
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;