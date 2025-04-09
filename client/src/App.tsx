import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout/layout";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

// Importa calendario
import Calendar from "@/pages/calendar";

// Importa dettaglio evento 
import EventDetail from "@/pages/events/[id]";

// Importa tutte le pagine dal barrel file
import {
  NotFound,
  Dashboard,
  ClientsPage,
  NewClientPage,
  EventsPage,
  NewEventPage,
  TasksPage,
  CollaboratorsPage,
  NewCollaboratorPage,
  CollaboratorDetailPage,
  ContractsPage,
  ContractViewPage,
  QuotesPage,
  SettingsPage,
  CategoriesPage,
  OriginsPage,
  AuthPage,
  ForgotPasswordPage,
  ResetPasswordPage
} from "@/pages";

// Importa le pagine dei servizi e pacchetti
import ServicesPage from "@/pages/services";
import ServiceDetailPage from "@/pages/services/[id]";
import ServiceBundlesPage from "@/pages/bundles";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/clients" component={ClientsPage} />
      <ProtectedRoute path="/clients/new" component={NewClientPage} />
      <ProtectedRoute path="/calendar" component={Calendar} />
      <ProtectedRoute path="/events" component={EventsPage} />
      <ProtectedRoute path="/events/new" component={NewEventPage} />
      <ProtectedRoute path="/events/:id" component={EventDetail} />
      <ProtectedRoute path="/tasks" component={TasksPage} />
      <ProtectedRoute path="/collaborators" component={CollaboratorsPage} />
      <ProtectedRoute path="/collaborators/new" component={NewCollaboratorPage} />
      <ProtectedRoute path="/collaborators/:id" component={CollaboratorDetailPage} />
      <ProtectedRoute path="/contracts" component={ContractsPage} />
      <ProtectedRoute path="/contracts/:id" component={ContractViewPage} />
      <ProtectedRoute path="/quotes" component={QuotesPage} />
      <ProtectedRoute path="/services" component={ServicesPage} />
      <ProtectedRoute path="/services/:id" component={ServiceDetailPage} />
      <ProtectedRoute path="/bundles" component={ServiceBundlesPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/settings/categories" component={CategoriesPage} />
      <ProtectedRoute path="/settings/origins" component={OriginsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
