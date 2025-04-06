import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { formatDate, getStatusBadge, getStatusText } from "@/lib/utils";
import { Event } from "@shared/schema";

const EventsSection = () => {
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display font-medium">Eventi Recenti</CardTitle>
          <Link href="/events">
            <Button variant="link" className="text-primary hover:text-primary-dark" size="sm">
              Vedi Tutti
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <div className="flex justify-center p-6">
            <div className="animate-pulse text-gray-500">Caricamento eventi...</div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex justify-center p-6">
            <p className="text-gray-500">Nessun evento recente</p>
          </div>
        ) : (
          events.slice(0, 3).map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <a className="block p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {event.coverImage ? (
                        <div 
                          className="w-12 h-12 rounded-lg bg-cover bg-center"
                          style={{ backgroundImage: `url(${event.coverImage})` }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-light/10 text-primary">
                          <i className={event.eventType === "wedding" ? "ri-heart-line" : "ri-camera-line"}></i>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                      <div className="flex items-center mt-1">
                        <i className="ri-calendar-line text-sm text-gray-400 mr-1.5"></i>
                        <span className="text-xs text-gray-500">{formatDate(event.date)}</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <i className="ri-map-pin-line text-sm text-gray-400 mr-1.5"></i>
                        <span className="text-xs text-gray-500 truncate max-w-[150px]">{event.location || "Nessuna location"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Badge variant={getStatusBadge(event.status)} className="mr-2">
                      {getStatusText(event.status)}
                    </Badge>
                    <Button variant="ghost" size="icon" className="p-1.5 text-gray-400 hover:text-gray-500">
                      <i className="ri-more-2-fill"></i>
                    </Button>
                  </div>
                </div>
              </a>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
};

export default EventsSection;
