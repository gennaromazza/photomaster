import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

interface StatCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
  title: string;
  value: number | string;
  className?: string;
  onClick?: () => void;
  detailsComponent?: React.ReactNode;
}

const StatCard = ({
  icon,
  iconBgColor = "bg-blue-100",
  iconTextColor = "text-primary",
  title,
  value,
  className,
  onClick,
  detailsComponent,
}: StatCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (detailsComponent) {
      setShowDetails(true);
    }
  };
  
  return (
    <>
      <div 
        className={cn(
          "bg-white rounded-lg shadow-sm p-5 transition-all", 
          detailsComponent || onClick ? "cursor-pointer hover:shadow-md hover:bg-gray-50" : "",
          className
        )}
        onClick={handleClick}
      >
        <div className="flex items-center">
          <div className={cn("p-3 rounded-full text-xl", iconBgColor, iconTextColor)}>
            {icon}
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        </div>
      </div>
      
      {detailsComponent && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            {detailsComponent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default StatCard;
