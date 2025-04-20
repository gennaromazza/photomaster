import React, { useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import MobileSidebar from "./mobile-sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Layout principale dell'applicazione
 * Responsabilità: Fornire una struttura coerente per tutte le pagine dell'applicazione
 */
export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleOpenSidebar = () => {
    setSidebarOpen(true);
  };
  
  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenSidebar={handleOpenSidebar} />
      
      <div className="flex flex-1">
        <Sidebar />
        <MobileSidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />
        
        <main className="flex-1 bg-background/50 dark:bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}