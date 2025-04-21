import { useLocation } from "wouter";
import { ChevronLeft, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { GalleryCleanup } from "@/components/galleries/gallery-cleanup";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function GalleryAdminPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="container py-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/galleries">Gallerie</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Amministrazione</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold tracking-tight">Amministrazione Gallerie</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setLocation("/galleries")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Torna alle gallerie
        </Button>
      </div>

      {/* Contenuto principale */}
      <Tabs defaultValue="cleanup">
        <TabsList className="mb-4">
          <TabsTrigger value="cleanup">
            Pulizia
          </TabsTrigger>
          <TabsTrigger value="settings">
            Impostazioni
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="cleanup" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GalleryCleanup />
            
            <div className="p-6 border rounded-lg shadow-sm bg-muted/30 flex flex-col justify-center">
              <Settings className="h-12 w-12 mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Più opzioni di amministrazione</h3>
              <p className="text-muted-foreground">
                In futuro qui verranno aggiunte altre funzionalità di amministrazione 
                per la gestione avanzata delle gallerie.
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-lg font-medium mb-4">Impostazioni Gallerie</h3>
            <p className="text-muted-foreground">
              Le impostazioni globali per le gallerie verranno implementate qui.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}