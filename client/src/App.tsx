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

// Importa dettaglio e modifica cliente
import ClientDetail from "@/pages/clients/[id]";
import EditClientPage from "@/pages/clients/edit/[id]";

// Importa callback per autenticazione Google
import AuthCallback from "@/pages/auth/callback";

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
import BundleDetailPage from "@/pages/bundles/detail/[id]";
import NewQuotePage from "@/pages/quotes/new-redesign";
import QuoteDetailPage from "@/pages/quotes/detail/[id]";
import QuotePublicPage from "@/pages/quotes/public/[token]";
import SignSuccessPage from "@/pages/quotes/sign-success";

// Importa le pagine finanziarie
import FinancesPage from "@/pages/dashboard/finances";
import ScheduledPaymentsPage from "@/pages/dashboard/finances/scheduled";

// Importa le pagine delle gallerie
import GalleriesPage from "@/pages/galleries";
import NewGalleryPage from "@/pages/galleries/new";
import GalleryDetailPage from "@/pages/galleries/[id]";
import PublicGalleryPage from "@/pages/public/galleries/[slug]";


function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/clients" component={ClientsPage} />
      <ProtectedRoute path="/clients/new" component={NewClientPage} />
      <ProtectedRoute path="/clients/edit/:id" component={EditClientPage} />
      <ProtectedRoute path="/clients/:id" component={ClientDetail} />
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
      <ProtectedRoute path="/quotes/new" component={NewQuotePage} />
      <ProtectedRoute path="/quotes/detail/:id" component={QuoteDetailPage} />
      <ProtectedRoute path="/services" component={ServicesPage} />
      <ProtectedRoute path="/services/:id" component={ServiceDetailPage} />
      <ProtectedRoute path="/bundles" component={ServiceBundlesPage} />
      <Route path="/bundles/detail/:id" component={BundleDetailPage} />
      <ProtectedRoute path="/profile" component={SettingsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/settings/categories" component={CategoriesPage} />
      <ProtectedRoute path="/settings/origins" component={OriginsPage} />
      <ProtectedRoute path="/dashboard/finances" component={FinancesPage} />
      <ProtectedRoute path="/dashboard/finances/scheduled" component={ScheduledPaymentsPage} />
      <ProtectedRoute path="/galleries" component={GalleriesPage} />
      <ProtectedRoute path="/galleries/new" component={NewGalleryPage} />
      <ProtectedRoute path="/galleries/:id" component={GalleryDetailPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route path="/quotes/public/:token" component={QuotePublicPage} />
      <Route path="/quotes/sign-success" component={SignSuccessPage} />
      <Route path="/galleries/:slug" component={PublicGalleryPage} />
      <Route path="/public/galleries/:slug" component={PublicGalleryPage} />
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