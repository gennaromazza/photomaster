import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/dashboard/stat-card";
import CalendarSection from "@/components/dashboard/calendar-section";
import EventsSection from "@/components/dashboard/events-section";
import TaskSection from "@/components/dashboard/task-section";
import ContractsSection from "@/components/dashboard/contracts-section";
import TeamSection from "@/components/dashboard/team-section";
import { useQuery } from "@tanstack/react-query";
import { Event, Task, Contract, Collaborator } from "@shared/schema";

const Dashboard = () => {
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
  
  const pendingContracts = contracts.filter(contract => contract.status === "pending").length;
  const activeEvents = events.filter(event => event.status === "in-progress").length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = tasks.filter(task => !task.completed).length;
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">Benvenuto, Marco</h1>
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
        />
        
        <StatCard
          icon={<i className="ri-check-double-line"></i>}
          iconBgColor="bg-green-100"
          iconTextColor="text-success"
          title="Task Completati"
          value={completedTasks}
        />
        
        <StatCard
          icon={<i className="ri-timer-line"></i>}
          iconBgColor="bg-amber-100"
          iconTextColor="text-warning"
          title="Task In Attesa"
          value={pendingTasks}
        />
        
        <StatCard
          icon={<i className="ri-file-list-3-line"></i>}
          iconBgColor="bg-red-100"
          iconTextColor="text-error"
          title="Contratti Pendenti"
          value={pendingContracts}
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
