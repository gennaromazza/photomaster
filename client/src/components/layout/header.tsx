import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import React from "react";

interface HeaderProps {
  onOpenSidebar: () => void;
}

const Header = ({ onOpenSidebar }: HeaderProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10 lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button 
          className="text-gray-500 hover:text-primary"
          onClick={onOpenSidebar}
          aria-label="Open menu"
        >
          <i className="ri-menu-line text-2xl"></i>
        </button>
        
        <div>
          <h1 className="font-display text-xl font-semibold text-primary">Studio Arté</h1>
        </div>
        
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary">
            <i className="ri-user-3-line text-2xl"></i>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Header;
