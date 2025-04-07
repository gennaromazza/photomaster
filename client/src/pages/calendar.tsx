import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Event, Client, Collaborator, insertEventSchema } from "@shared/schema";
import { CreateEventForm } from "@/components/calendar";
import { Link } from "wouter";

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
  
  const { data: events = [], isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const { data: collaborators = [], isLoading: isLoadingCollaborators } = useQuery<Collaborator[]>({
    queryKey: ["/api/collaborators"],
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
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day.getDate() && 
             eventDate.getMonth() === day.getMonth() && 
             eventDate.getFullYear() === day.getFullYear();
    });
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
        <div className="mt-4 lg:mt-0 flex space-x-3">
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
          {/* Calendar Grid */}
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
                    "min-h-[80px] p-1 border border-gray-100 rounded-md cursor-pointer transition-colors hover:bg-gray-50",
                    isSelected && "bg-primary-light/5"
                  )}
                >
                  <div className={cn(
                    "text-xs",
                    !isCurrentMonth && "text-gray-400",
                    isSelected && "font-medium text-primary"
                  )}>
                    {format(day, "d")}
                  </div>
                  
                  {dayEvents.slice(0, 2).map((event, eventIndex) => (
                    <Link key={eventIndex} href={`/events/${event.id}`}>
                      <div 
                        className={cn(
                          "mt-1 p-1 text-xs rounded truncate",
                          event.eventType === "wedding" ? "bg-accent-light text-accent-dark" : "bg-blue-100 text-blue-800"
                        )}
                      >
                        {event.title}
                      </div>
                    </Link>
                  ))}
                  
                  {dayEvents.length > 2 && (
                    <div className="mt-1 text-xs text-gray-500 text-center">
                      +{dayEvents.length - 2} altri
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog per creare un nuovo evento */}
      <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Nuovo Evento</DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <span>Crea un nuovo evento per il {format(selectedDate, "d MMMM yyyy", { locale: it })}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedDate && (
            <CreateEventForm 
              selectedDate={selectedDate} 
              clients={clients} 
              collaborators={collaborators}
              onSuccess={handleCreateEventSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;