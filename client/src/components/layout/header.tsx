import React, { useState } from "react";
import { Link } from "@/components/ui/custom-link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Menu, MessageSquare, CalendarDays, Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { GlobalSearchBar } from "@/components/global-search";

export interface HeaderProps {
  onOpenSidebar: () => void;
}

/**
 * Header dell'applicazione
 * Responsabilità: Mostrare la barra di navigazione superiore con logo, cerca, notifiche, ecc.
 */
export default function Header({ onOpenSidebar }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2"
            onClick={onOpenSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <Link href="/" className="flex items-center">
            <span className="font-playfair text-xl font-bold tracking-wide">
              <span>Image</span>
              <span className="font-light">Studio</span>
            </span>
          </Link>
        </div>
        
        <div className="hidden md:flex md:items-center md:gap-4">
          <div className="w-64">
            <GlobalSearchBar />
          </div>
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
          </Button>
          
          <Button variant="ghost" size="icon">
            <MessageSquare className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon">
            <CalendarDays className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Pulsante di ricerca mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatar.jpg" alt="Gennaro Mazzacane" />
                  <AvatarFallback>GM</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Gennaro Mazzacane</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    gennaro.mazzacane@gmail.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profilo</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Impostazioni</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help">Aiuto</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                {logoutMutation.isPending ? "Logout in corso..." : "Logout"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Modal di ricerca per dispositivi mobili */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="top" className="pt-10">
          <SheetHeader className="mb-4">
            <SheetTitle>Ricerca</SheetTitle>
          </SheetHeader>
          <GlobalSearchBar />
        </SheetContent>
      </Sheet>
    </header>
  );
}