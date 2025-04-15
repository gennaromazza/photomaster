import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Event, Client } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import CollaboratorsCard from "@/components/events/collaborators-card";
import EventTasks from "@/components/events/event-tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EventDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const eventId = parseInt(id);

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !isNaN(eventId),
  });

  //  Add your existing EventDetail component code here.  The instructions indicate that this component should be moved and integrated into the new routing structure, but no existing code is provided to integrate.  Therefore, this comment placeholder is included as a guide if further code is made available.

}