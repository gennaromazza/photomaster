import React, { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import MobileSidebar from "./mobile-sidebar";
import { useLayoutContext } from "@/hooks/use-layout-context";

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Layout principale dell'applicazione
 * Responsabilità: Fornire una struttura coerente per tutte le pagine dell'applicazione
 * Evita duplicazioni utilizzando il contesto
 */
export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { registerLayout, unregisterLayout } = useLayoutContext();
  const [canRender, setCanRender] = useState(false);
  
  // Registra il layout al mount
  useEffect(() => {
    const shouldRender = registerLayout();
    setCanRender(shouldRender);
    
    return () => {
      unregisterLayout();
    };
  }, [registerLayout, unregisterLayout]);
  
  const handleOpenSidebar = () => {
    setSidebarOpen(true);
  };
  
  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };
  
  // Se un altro layout è già montato, renderizza solo i children
  if (!canRender) {
    return <>{children}</>;
  }
  
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