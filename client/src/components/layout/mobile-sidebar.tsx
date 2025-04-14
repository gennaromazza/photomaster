
import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
  BookMarked,
  X,
} from "lucide-react";

export interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({
  isOpen,
  onClose,
}: MobileSidebarProps) {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/") {
      return location === path;
    }
    return location.startsWith(path);
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center justify-between">
            <span className="font-playfair text-xl">
              <span className="font-bold">Image</span>
              <span className="font-light">Studio</span>
            </span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>
        
        <div className="py-4 px-2">
          <nav className="flex flex-col gap-1">
            <NavItem
              href="/"
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
              isActive={isActive("/")}
              onClick={onClose}
            />
            
            <NavItem
              href="/calendar"
              icon={<Calendar className="h-4 w-4" />}
              label="Calendario"
              isActive={isActive("/calendar")}
              onClick={onClose}
            />

            <NavItem
              href="/quotes"
              icon={<FileText className="h-4 w-4" />}
              label="Preventivi"
              isActive={isActive("/quotes")}
              onClick={onClose}
            />
            
            <NavItem
              href="/contracts"
              icon={<FileSignature className="h-4 w-4" />}
              label="Contratti"
              isActive={isActive("/contracts")}
              onClick={onClose}
            />
            
            <NavItem
              href="/clients"
              icon={<Users className="h-4 w-4" />}
              label="Clienti"
              isActive={isActive("/clients")}
              onClick={onClose}
            />

            <NavItem
              href="/services"
              icon={<Package className="h-4 w-4" />}
              label="Servizi"
              isActive={isActive("/services")}
              onClick={onClose}
            />
            
            <NavItem
              href="/tasks"
              icon={<BookMarked className="h-4 w-4" />}
              label="Attività"
              isActive={isActive("/tasks")}
              onClick={onClose}
            />
            
            <NavItem
              href="/reports"
              icon={<BarChart2 className="h-4 w-4" />}
              label="Reportistica"
              isActive={isActive("/reports")}
              onClick={onClose}
            />
          </nav>
        </div>
        
        <SheetFooter className="px-4 py-4 mt-auto border-t">
          <NavItem
            href="/settings"
            icon={<Settings className="h-4 w-4" />}
            label="Impostazioni"
            isActive={isActive("/settings")}
            onClick={onClose}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function NavItem({
  href,
  icon,
  label,
  isActive,
  onClick,
}: NavItemProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={onClick}
      >
        {icon}
        {label}
      </div>
    </Link>
  );
}
