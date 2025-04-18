import React from "react";
import { useLocation } from "wouter";
import { Link } from "@/components/ui/custom-link";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Calendar,
  FileText,
  Settings,
  Package,
  ShoppingBag,
  BarChart2,
  LayoutDashboard,
  FileSignature,
  MessageSquare,
  Briefcase,
  BookMarked,
  Euro,
} from "lucide-react";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
}

/**
 * Componente per i link nella sidebar
 */
function SidebarLink({ href, icon, text, isActive }: SidebarLinkProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {icon}
        {text}
      </div>
    </Link>
  );
}

/**
 * Sidebar dell'applicazione
 * Responsabilità: Fornire la navigazione principale dell'applicazione
 */
export default function Sidebar() {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/") {
      return location === path;
    }
    return location.startsWith(path);
  };
  
  return (
    <div className="hidden md:flex md:flex-col md:border-r md:bg-muted/40 md:w-56 md:overflow-y-auto">
      <div className="flex flex-col gap-2 p-4">
        <SidebarLink
          href="/"
          icon={<LayoutDashboard className="h-4 w-4" />}
          text="Dashboard"
          isActive={isActive("/")}
        />

        <SidebarLink
          href="/calendar"
          icon={<Calendar className="h-4 w-4" />}
          text="Calendario"
          isActive={isActive("/calendar")}
        />
        
        <SidebarLink
          href="/quotes"
          icon={<FileText className="h-4 w-4" />}
          text="Preventivi"
          isActive={isActive("/quotes")}
        />
        
        <SidebarLink
          href="/events"
          icon={<Calendar className="h-4 w-4" />}
          text="Eventi"
          isActive={isActive("/events")}
        />

        <SidebarLink
          href="/contracts"
          icon={<FileSignature className="h-4 w-4" />}
          text="Contratti"
          isActive={isActive("/contracts")}
        />
        
        <SidebarLink
          href="/clients"
          icon={<Users className="h-4 w-4" />}
          text="Clienti"
          isActive={isActive("/clients")}
        />
        
        <SidebarLink
          href="/services"
          icon={<Package className="h-4 w-4" />}
          text="Servizi"
          isActive={isActive("/services")}
        />
        
        <SidebarLink
          href="/messages"
          icon={<MessageSquare className="h-4 w-4" />}
          text="Messaggi"
          isActive={isActive("/messages")}
        />
        
        <SidebarLink
          href="/tasks"
          icon={<BookMarked className="h-4 w-4" />}
          text="Attività"
          isActive={isActive("/tasks")}
        />
        
        <SidebarLink
          href="/reports"
          icon={<BarChart2 className="h-4 w-4" />}
          text="Reportistica"
          isActive={isActive("/reports")}
        />
        
        <SidebarLink
          href="/dashboard/finances"
          icon={<Euro className="h-4 w-4" />}
          text="Finanza"
          isActive={isActive("/dashboard/finances")}
        />
      </div>
      
      <div className="mt-auto p-4">
        <SidebarLink
          href="/settings"
          icon={<Settings className="h-4 w-4" />}
          text="Impostazioni"
          isActive={isActive("/settings")}
        />
      </div>
    </div>
  );
}