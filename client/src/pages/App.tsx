import { useState, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout/layout";
import HomePage from "./home";
import NotFoundPage from "./not-found";
import ClientsPage from "./clients";
import ClientsDetailPage from "./clients/[id]";
import QuotesPage from "./quotes";
import QuoteDetailPage from "./quotes/detail/[id]";
import NewQuotePage from "./quotes/new-quote";
import PublicQuotePage from "./quotes/public/[token]";
import EventsPage from "./events";
import NewEventPage from "./events/new";
import ServicesPage from "./services";
import ServiceDetailPage from "./services/[id]";
import ProductsPage from "./products";
import ProductDetailPage from "./products/[id]";
import ContractsPage from "./contracts";
import ContractViewPage from "./contracts/view";
import SettingsPage from "./settings";
import CalendarPage from "./calendar";
import CollaboratorsPage from "./collaborators";
import CollaboratorDetailPage from "./collaborators/[id]";
import TasksPage from "./tasks";
import ClausesPage from "./clauses";
import GalleriesPage from "./galleries";
import NewGalleryPage from "./galleries/new";
import GalleryDetailPage from "./galleries/[id]";
import GalleryAdminPage from "./galleries/admin";
import FinancesPage from "./dashboard/finances";
import ScheduledPaymentsPage from "./dashboard/finances/scheduled";
import { ProtectedRoute } from "@/lib/protected-route";

// Crea un client React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minuti
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

function Router() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Scroll to top on navigation
    window.scrollTo(0, 0);
  }, [location]);
  
  return (
    <Switch>
      {/* Home / Dashboard */}
      <Route path="/" component={HomePage} />
      
      {/* Clients */}
      <Route path="/clients" component={ClientsPage} />
      <Route path="/clients/:id" component={ClientsDetailPage} />
      
      {/* Quotes */}
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/quotes/new-quote" component={NewQuotePage} />
      <Route path="/quotes/detail/:id" component={QuoteDetailPage} />
      <Route path="/quotes/public/:token" component={PublicQuotePage} />
      
      {/* Events */}
      <Route path="/events" component={EventsPage} />
      <Route path="/events/new" component={NewEventPage} />
      
      {/* Services */}
      <Route path="/services" component={ServicesPage} />
      <Route path="/services/:id" component={ServiceDetailPage} />
      
      {/* Products */}
      <Route path="/products" component={ProductsPage} />
      <Route path="/products/:id" component={ProductDetailPage} />
      
      {/* Contracts */}
      <Route path="/contracts" component={ContractsPage} />
      <Route path="/contracts/view" component={ContractViewPage} />
      
      {/* Settings */}
      <Route path="/settings" component={SettingsPage} />
      
      {/* Calendar */}
      <Route path="/calendar" component={CalendarPage} />
      
      {/* Collaborators */}
      <Route path="/collaborators" component={CollaboratorsPage} />
      <Route path="/collaborators/:id" component={CollaboratorDetailPage} />
      
      {/* Tasks */}
      <Route path="/tasks" component={TasksPage} />
      
      {/* Clausole Contrattuali */}
      <Route path="/clauses" component={ClausesPage} />
      
      {/* Gallerie */}
      <Route path="/galleries" component={GalleriesPage} />
      <Route path="/galleries/new" component={NewGalleryPage} />
      <Route path="/galleries/admin" component={GalleryAdminPage} />
      <Route path="/galleries/:id" component={GalleryDetailPage} />
      
      {/* Finanze */}
      <Route path="/dashboard/finances" component={FinancesPage} />
      <Route path="/dashboard/finances/scheduled" component={ScheduledPaymentsPage} />
      
      {/* Not Found */}
      <Route component={NotFoundPage} />
    </Switch>
  );
}