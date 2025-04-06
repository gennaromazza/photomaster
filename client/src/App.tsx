import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients/index";
import NewClientPage from "@/pages/clients/new";
import EventsPage from "@/pages/events/index";
import NewEventPage from "@/pages/events/new";
import TasksPage from "@/pages/tasks/index";
import CollaboratorsPage from "@/pages/collaborators/index";
import ContractsPage from "@/pages/contracts/index";
import ContractViewPage from "@/pages/contracts/view";
import QuotesPage from "@/pages/quotes/index";
import SettingsPage from "@/pages/settings/index";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/clients/new" component={NewClientPage} />
      <Route path="/events" component={EventsPage} />
      <Route path="/events/new" component={NewEventPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/collaborators" component={CollaboratorsPage} />
      <Route path="/contracts" component={ContractsPage} />
      <Route path="/contracts/:id" component={ContractViewPage} />
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Router />
      </Layout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
