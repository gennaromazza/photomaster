import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
  title: string;
  value: number | string;
  className?: string;
}

const StatCard = ({
  icon,
  iconBgColor = "bg-blue-100",
  iconTextColor = "text-primary",
  title,
  value,
  className,
}: StatCardProps) => {
  return (
    <div className={cn("bg-white rounded-lg shadow-sm p-5", className)}>
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
  );
};

export default StatCard;
