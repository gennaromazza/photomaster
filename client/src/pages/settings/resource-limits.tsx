import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Info, Mail, HardDrive } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

/**
 * Pagina per la visualizzazione e gestione dei limiti delle risorse
 * - Email inviate (giornaliere/mensili)
 * - Spazio di archiviazione utilizzato
 */
export default function ResourceLimitsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('email');
  
  // Ottieni i dati sull'utilizzo delle email
  const { data: emailData, isLoading: isEmailLoading } = useQuery({
    queryKey: ['/api/settings/email-usage'],
    enabled: user?.role === 'admin'
  });
  
  // Ottieni i dati sull'utilizzo dello spazio
  const { data: storageData, isLoading: isStorageLoading } = useQuery({
    queryKey: ['/api/settings/storage-usage'],
    enabled: user?.role === 'admin'
  });
  
  // Dati statistici di esempio per i grafici
  const emailStats = emailData?.stats?.daily || generateSampleEmailData();
  const storageUsage = storageData || {
    usedGB: 1.2,
    totalGB: 5,
    percentUsed: 24,
    byGallery: [
      { name: 'Matrimonio Silva', value: 450 },
      { name: 'Battesimo Russo', value: 230 },
      { name: 'Sessione Moda', value: 180 },
      { name: 'Eventi Vari', value: 120 },
      { name: 'Book Ritratti', value: 220 }
    ]
  };
  
  // Colori per i grafici
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9747FF'];
  
  return (
    <>
      <Helmet>
        <title>Limiti Risorse - StudioMaster</title>
      </Helmet>
      
      <div className="container max-w-screen-xl py-6">
        <h1 className="text-3xl font-bold mb-2">Limiti Risorse</h1>
        <p className="text-muted-foreground mb-6">
          Monitora l'utilizzo delle email e dello spazio di archiviazione
        </p>
        
        <Tabs defaultValue="email" value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="storage">
              <HardDrive className="mr-2 h-4 w-4" />
              Spazio di Archiviazione
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Email Inviate Oggi</CardTitle>
                  <CardDescription>
                    Sul limite giornaliero
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {emailData?.sentToday || 0} / {emailData?.dailyLimit || 100}
                  </div>
                  <Progress 
                    value={emailData ? (emailData.sentToday / emailData.dailyLimit * 100) : 20} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {emailData?.remainingToday || 80} email rimanenti oggi
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Email Inviate Questo Mese</CardTitle>
                  <CardDescription>
                    Sul limite mensile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {emailData?.sentThisMonth || 0} / {emailData?.monthlyLimit || 3000}
                  </div>
                  <Progress 
                    value={emailData ? (emailData.sentThisMonth / emailData.monthlyLimit * 100) : 15} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {emailData?.remainingThisMonth || 2550} email rimanenti questo mese
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Stato</CardTitle>
                  <CardDescription>
                    Stato attuale del sistema di invio email
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {emailData?.isLimitReached ? (
                      <AlertTriangle className="text-destructive h-5 w-5" />
                    ) : emailData?.isWarningReached ? (
                      <Info className="text-warning h-5 w-5" />
                    ) : (
                      <CheckCircle2 className="text-success h-5 w-5" />
                    )}
                    <span className="font-medium">
                      {emailData?.isLimitReached ? "Limite Raggiunto" : 
                       emailData?.isWarningReached ? "Avviso" : "Normale"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {emailData?.isLimitReached ? 
                      "Solo le email critiche verranno inviate fino a domani." : 
                     emailData?.isWarningReached ? 
                      "Si sta avvicinando al limite giornaliero. Email a bassa priorità potrebbero essere limitate." : 
                      "Il sistema funziona normalmente."}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Statistiche di Invio Email</CardTitle>
                <CardDescription>
                  Andamento degli ultimi 30 giorni
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={emailStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="Email Inviate"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {(emailData?.isWarningReached || emailData?.isLimitReached) && (
              <Alert variant={emailData.isLimitReached ? "destructive" : "warning"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {emailData.isLimitReached ? "Limite di email raggiunto" : "Avvicinamento al limite di email"}
                </AlertTitle>
                <AlertDescription>
                  {emailData.isLimitReached ? 
                    "Hai raggiunto il limite giornaliero di invio email. Solo le email critiche verranno inviate fino a domani." : 
                    "Ti stai avvicinando al limite giornaliero di invio email. Considera di rimandare le comunicazioni non urgenti."}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="storage" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Spazio Utilizzato</CardTitle>
                  <CardDescription>
                    Totale spazio di archiviazione
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {storageUsage.usedGB.toFixed(1)} GB / {storageUsage.totalGB} GB
                  </div>
                  <Progress 
                    value={storageUsage.percentUsed} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {(storageUsage.totalGB - storageUsage.usedGB).toFixed(1)} GB rimanenti
                  </p>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Distribuzione Spazio</CardTitle>
                  <CardDescription>
                    Suddivisione per galleria
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={storageUsage.byGallery}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {storageUsage.byGallery.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} MB`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Note sullo Spazio di Archiviazione</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Lo spazio di archiviazione viene utilizzato per memorizzare foto, video e altri file nel sistema.
                  </p>
                  <p>
                    Il superamento del limite di spazio impedirà il caricamento di nuovi file.
                    In questo caso, sarà necessario eliminare alcuni contenuti o aggiornare il piano.
                  </p>
                  <p>
                    Consiglio: elimina regolarmente i contenuti non necessari e comprimi le immagini prima del caricamento per ottimizzare lo spazio.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// Funzione di supporto per generare dati di esempio
function generateSampleEmailData() {
  const data = [];
  
  // Genera gli ultimi 30 giorni
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Formato data: "GG/MM"
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Genera un numero casuale tra 5 e 30
    const count = Math.floor(Math.random() * 25) + 5;
    
    data.push({
      date: formattedDate,
      count
    });
  }
  
  return data;
}