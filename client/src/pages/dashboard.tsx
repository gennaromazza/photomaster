import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/dashboard/stat-card";
import CalendarSection from "@/components/dashboard/calendar-section";
import EventsSection from "@/components/dashboard/events-section";
import TaskSection from "@/components/dashboard/task-section";
import ContractsSection from "@/components/dashboard/contracts-section";
import TeamSection from "@/components/dashboard/team-section";
import EventCategoriesChart from "@/components/dashboard/event-categories-chart";
import QuotesStatusDetail from "@/components/dashboard/quotes-status-detail";
import { useQuery } from "@tanstack/react-query";
import { Event, Task, Contract, Collaborator, Quote } from "@shared/schema";

const Dashboard = () => {
  const [_, navigate] = useLocation();
  
  // Ottieni i dati dell'utente corrente
  const { data: userData } = useQuery<{
    id: number;
    username: string;
    fullName?: string;
    email?: string;
  }>({
    queryKey: ["/api/user"],
  });
  
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });
  
  const { data: collaborators = [] } = useQuery<Collaborator[]>({
    queryKey: ["/api/collaborators"],
  });
  
  // Query per tutti i preventivi per poterli filtrare
  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });
  
  // Filtrare preventivi per stato
  const quotesToSign = quotes.filter(quote => quote.status === 'draft' || quote.status === 'pending');
  const signedQuotes = quotes.filter(quote => quote.status === 'signed');
  
  // Conteggio eventi attivi corretto - verifica se è definito lo stato
  const activeEvents = events.filter(event => event.status === "in-progress" || event.status === "active").length;
  
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = tasks.filter(task => !task.completed).length;
  
  // Conteggio eventi per categoria
  const eventsByCategory = events.reduce((acc, event) => {
    if (event.categoryId) {
      acc[event.categoryId] = (acc[event.categoryId] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);
  
  // IMPORTANTE: un preventivo firmato diventa un evento attivo
  // Quindi gli eventi attivi rappresentano i preventivi che sono stati firmati e sono in corso
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">
            Benvenuto, {userData?.fullName || userData?.username || "Utente"}
          </h1>
          <p className="mt-1 text-gray-500">Ecco un riepilogo delle tue attività</p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Link href="/events/new">
            <Button className="inline-flex items-center">
              <i className="ri-add-line mr-2"></i>
              Nuovo Evento
            </Button>
          </Link>
          <Link href="/clients/new">
            <Button variant="outline" className="inline-flex items-center text-gray-700">
              <i className="ri-user-add-line mr-2"></i>
              Nuovo Cliente
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<i className="ri-calendar-event-line"></i>}
          iconBgColor="bg-blue-100"
          iconTextColor="text-primary"
          title="Eventi Attivi"
          value={activeEvents}
          detailsComponent={<EventCategoriesChart />}
        />
        
        <StatCard
          icon={<i className="ri-file-list-3-line"></i>}
          iconBgColor="bg-pink-100"
          iconTextColor="text-pink-700"
          title="Preventivi da Firmare"
          value={quotesToSign.length}
          detailsComponent={<QuotesStatusDetail />}
        />
        
        <StatCard
          icon={<i className="ri-timer-line"></i>}
          iconBgColor="bg-amber-100"
          iconTextColor="text-warning"
          title="Task In Attesa"
          value={pendingTasks}
          onClick={() => navigate("/tasks")}
        />
        
        <StatCard
          icon={<i className="ri-group-line"></i>}
          iconBgColor="bg-indigo-100"
          iconTextColor="text-indigo-700"
          title="Collaboratori"
          value={collaborators.length}
          onClick={() => navigate("/collaborators")}
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar column */}
        <div className="lg:col-span-2">
          <CalendarSection />
          <EventsSection />
        </div>

        {/* Sidebar content */}
        <div className="lg:col-span-1 space-y-8">
          <TaskSection />
          <ContractsSection />
          <TeamSection />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
