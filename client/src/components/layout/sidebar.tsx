import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import React from "react";

interface SidebarProps {
  className?: string;
}

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

const SidebarLink = ({ href, icon, children, active }: SidebarLinkProps) => {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center px-4 py-2.5 text-sm font-medium rounded-md",
          active 
            ? "bg-background text-primary" 
            : "text-gray-600 hover:bg-background hover:text-primary"
        )}
      >
        <span className="text-lg mr-3">{icon}</span>
        {children}
      </a>
    </Link>
  );
};

const Sidebar = ({ className }: SidebarProps) => {
  const [location] = useLocation();
  
  return (
    <aside className={cn("hidden lg:flex flex-col w-64 bg-white border-r border-gray-200", className)}>
      <div className="p-6 border-b border-gray-100">
        <h1 className="font-display text-xl font-semibold text-primary">Studio Arté</h1>
        <p className="text-sm text-gray-500 mt-1">Gestione Fotografica</p>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
        <SidebarLink 
          href="/" 
          icon={<i className="ri-dashboard-line" />} 
          active={location === "/"}
        >
          Dashboard
        </SidebarLink>
        
        <SidebarLink 
          href="/clients" 
          icon={<i className="ri-user-3-line" />} 
          active={location.startsWith("/clients")}
        >
          Clienti
        </SidebarLink>
        
        <SidebarLink 
          href="/events" 
          icon={<i className="ri-calendar-line" />} 
          active={location.startsWith("/events")}
        >
          Eventi
        </SidebarLink>
        
        <SidebarLink 
          href="/tasks" 
          icon={<i className="ri-task-line" />} 
          active={location.startsWith("/tasks")}
        >
          Task
        </SidebarLink>
        
        <SidebarLink 
          href="/collaborators" 
          icon={<i className="ri-team-line" />} 
          active={location.startsWith("/collaborators")}
        >
          Collaboratori
        </SidebarLink>
        
        <SidebarLink 
          href="/contracts" 
          icon={<i className="ri-file-list-3-line" />} 
          active={location.startsWith("/contracts")}
        >
          Contratti
        </SidebarLink>
        
        <SidebarLink 
          href="/quotes" 
          icon={<i className="ri-money-euro-circle-line" />} 
          active={location.startsWith("/quotes")}
        >
          Preventivi
        </SidebarLink>
        
        <div className="pt-4 mt-4 border-t border-gray-100">
          <SidebarLink 
            href="/settings" 
            icon={<i className="ri-settings-4-line" />}
            active={location.startsWith("/settings")}
          >
            Impostazioni
          </SidebarLink>
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="font-medium">MR</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">Marco Rossi</p>
            <p className="text-xs text-gray-500">Fotografo</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
