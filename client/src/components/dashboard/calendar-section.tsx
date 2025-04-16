import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Event } from "@shared/schema";

const weekdays = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];

// Function to adjust the day for the Italian locale (Monday is 1)
function getAdjustedDay(date: Date): number {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1; // Convert Sunday (0) to 6, and shift other days
}

const CalendarSection = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
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
    
    return uniqueEvents;
  };
  
  return (
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
                className={cn(
                  "min-h-[80px] p-1 border border-gray-100 rounded-md",
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
                  <div 
                    key={eventIndex}
                    className={cn(
                      "mt-1 p-1 text-xs rounded truncate",
                      event.eventType === "wedding" ? "bg-accent-light text-accent-dark" : "bg-blue-100 text-blue-800"
                    )}
                  >
                    {event.title}
                  </div>
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
  );
};

export default CalendarSection;
