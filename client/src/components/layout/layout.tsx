import { useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import MobileSidebar from "./mobile-sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleOpenSidebar = () => {
    setIsMobileSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <MobileSidebar isOpen={isMobileSidebarOpen} onClose={handleCloseSidebar} />

      <div className="flex-1 flex flex-col">
        <Header onOpenSidebar={handleOpenSidebar} />
        <main className="flex-1 overflow-y-auto bg-background pb-10 pt-0 lg:pt-0 mt-16 lg:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
