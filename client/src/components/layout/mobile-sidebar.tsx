import { Link, useLocation } from "wouter";
import { cn, getInitials } from "@/lib/utils";
import React, { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MobileSidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

const MobileSidebarLink = ({ href, icon, children, active, onClick }: MobileSidebarLinkProps) => {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center px-4 py-2.5 text-sm font-medium rounded-md",
          active 
            ? "bg-background text-primary" 
            : "text-gray-600 hover:bg-background hover:text-primary"
        )}
        onClick={onClick}
      >
        <span className="text-lg mr-3">{icon}</span>
        {children}
      </a>
    </Link>
  );
};

const MobileSidebar = ({ isOpen, onClose }: MobileSidebarProps) => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  // Close sidebar when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <>
      <div 
        className="fixed inset-0 z-20 bg-gray-600 bg-opacity-75 lg:hidden" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-white transform transition lg:hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h1 className="font-display text-xl font-semibold text-primary">Studio Arté</h1>
          <button 
            className="text-gray-500 hover:text-primary" 
            onClick={onClose}
            aria-label="Close menu"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          <MobileSidebarLink 
            href="/" 
            icon={<i className="ri-dashboard-line" />} 
            active={location === "/"}
            onClick={onClose}
          >
            Dashboard
          </MobileSidebarLink>
          
          <MobileSidebarLink 
            href="/clients" 
            icon={<i className="ri-user-3-line" />} 
            active={location.startsWith("/clients")}
            onClick={onClose}
          >
            Clienti
          </MobileSidebarLink>
          
          <MobileSidebarLink 
            href="/calendar" 
            icon={<i className="ri-calendar-2-line" />} 
            active={location.startsWith("/calendar")}
            onClick={onClose}
          >
            Calendario
          </MobileSidebarLink>
          
          <MobileSidebarLink 
            href="/events" 
            icon={<i className="ri-calendar-event-line" />} 
            active={location.startsWith("/events")}
            onClick={onClose}
          >
            Eventi
          </MobileSidebarLink>
          
          <MobileSidebarLink 
            href="/tasks" 
            icon={<i className="ri-task-line" />} 
            active={location.startsWith("/tasks")}
            onClick={onClose}
          >
            Task
          </MobileSidebarLink>
          
          <MobileSidebarLink 
            href="/collaborators" 
            icon={<i className="ri-team-line" />} 
            active={location.startsWith("/collaborators")}
            onClick={onClose}
          >
            Collaboratori
          </MobileSidebarLink>
          
          <MobileSidebarLink 
            href="/contracts" 
            icon={<i className="ri-file-list-3-line" />} 
            active={location.startsWith("/contracts")}
            onClick={onClose}
          >
            Contratti
          </MobileSidebarLink>
          
          <MobileSidebarLink 
            href="/quotes" 
            icon={<i className="ri-money-euro-circle-line" />} 
            active={location.startsWith("/quotes")}
            onClick={onClose}
          >
            Preventivi
          </MobileSidebarLink>
          
          <div className="pt-4 mt-4 border-t border-gray-100">
            <MobileSidebarLink 
              href="/settings" 
              icon={<i className="ri-settings-4-line" />}
              active={location.startsWith("/settings")}
              onClick={onClose}
            >
              Impostazioni
            </MobileSidebarLink>
          </div>
        </nav>
        
        {user && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="font-medium">{getInitials(user.fullName.split(' ')[0], user.fullName.split(' ').slice(1).join(' '))}</span>
                </div>
                <div className="ml-3 flex-1 truncate">
                  <p className="text-sm font-medium text-gray-700">{user.fullName}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={() => {
                  logoutMutation.mutate();
                  onClose();
                }}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnessione...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnetti
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default MobileSidebar;
