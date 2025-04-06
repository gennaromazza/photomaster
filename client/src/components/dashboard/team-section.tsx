import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getInitials } from "@/lib/utils";
import { Collaborator } from "@shared/schema";

const TeamSection = () => {
  const { data: collaborators = [], isLoading } = useQuery<Collaborator[]>({
    queryKey: ["/api/collaborators"],
  });
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display font-medium">Team</CardTitle>
          <Link href="/collaborators/new">
            <Button variant="ghost" size="icon" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
              <i className="ri-add-line"></i>
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-pulse text-gray-500">Caricamento team...</div>
            </div>
          ) : collaborators.length === 0 ? (
            <div className="flex justify-center p-4">
              <p className="text-gray-500">Nessun collaboratore</p>
            </div>
          ) : (
            collaborators.slice(0, 3).map((collaborator) => (
              <div key={collaborator.id} className="flex items-center">
                {collaborator.profileImage ? (
                  <img 
                    src={collaborator.profileImage} 
                    alt={`${collaborator.firstName} ${collaborator.lastName}`} 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="text-xs font-medium">
                      {getInitials(collaborator.firstName, collaborator.lastName)}
                    </span>
                  </div>
                )}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {collaborator.firstName} {collaborator.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{collaborator.role}</p>
                </div>
                <div className="ml-auto flex">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    collaborator.status === "available" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {collaborator.status === "available" ? "Disponibile" : "Occupato"}
                  </span>
                </div>
              </div>
            ))
          )}
          
          {collaborators.length > 3 && (
            <Link href="/collaborators">
              <Button variant="ghost" className="w-full text-sm text-primary hover:text-primary-dark mt-2">
                Vedi tutti ({collaborators.length})
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamSection;
