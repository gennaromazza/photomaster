import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { formatDate, getStatusBadge, getStatusText } from "@/lib/utils";
import { Contract } from "@shared/schema";

const ContractsSection = () => {
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });
  
  return (
    <Card className="overflow-hidden mb-8">
      <CardHeader className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display font-medium">Contratti Recenti</CardTitle>
          <Link href="/contracts">
            <Button variant="link" className="text-primary hover:text-primary-dark" size="sm">
              Vedi Tutti
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-pulse text-gray-500">Caricamento contratti...</div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex justify-center p-4">
            <p className="text-gray-500">Nessun contratto recente</p>
          </div>
        ) : (
          contracts.slice(0, 3).map((contract) => (
            <div key={contract.id} onClick={() => window.location.href = `/contracts/${contract.id}`} className="block p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{contract.title}</h3>
                  <div className="flex items-center mt-1">
                    <i className="ri-calendar-line text-xs text-gray-400 mr-1.5"></i>
                    <span className="text-xs text-gray-500">
                      {contract.createdAt ? formatDate(contract.createdAt, "dd/MM/yyyy") : ""}
                    </span>
                  </div>
                </div>
                <Badge variant={getStatusBadge(contract.status)}>
                  {contract.status === "signed" ? "Firmato" : "In Attesa"}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default ContractsSection;
