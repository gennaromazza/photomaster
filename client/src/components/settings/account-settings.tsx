import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { Loader2, LogOut, Save, User as UserIcon } from "lucide-react";
import { PasswordStrengthMeter } from "./password-strength-meter";

// Schema per il form di aggiornamento profilo
const updateProfileSchema = z.object({
  fullName: z.string().min(3, "Il nome completo deve contenere almeno 3 caratteri"),
  email: z.string().email("Inserisci un indirizzo email valido"),
});

// Schema per il form di aggiornamento password
const updatePasswordSchema = z.object({
  password: z.string().min(6, "La password deve contenere almeno 6 caratteri"),
  confirmPassword: z.string().min(6, "La conferma password deve contenere almeno 6 caratteri"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

export function AccountSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // Query per ottenere i dati dell'utente corrente
  const { data: user, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Form per l'aggiornamento dei dati del profilo
  const profileForm = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
    },
    values: {
      fullName: user?.fullName || "",
      email: user?.email || "",
    },
  });

  // Form per l'aggiornamento della password
  const passwordForm = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Mutation per aggiornare il profilo utente
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profilo aggiornato",
        description: "Le informazioni del profilo sono state aggiornate con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del profilo: " + 
                    (error instanceof Error ? error.message : "errore sconosciuto"),
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare la password
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}/password`, data);
      return response.json();
    },
    onSuccess: () => {
      setIsChangingPassword(false);
      passwordForm.reset();
      toast({
        title: "Password aggiornata",
        description: "La tua password è stata aggiornata con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della password: " +
                    (error instanceof Error ? error.message : "errore sconosciuto"),
        variant: "destructive",
      });
    },
  });

  // Mutation per il logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/logout", {});
      return response.json();
    },
    onSuccess: () => {
      // Reindirizza alla pagina di login
      window.location.href = "/auth";
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il logout: " +
                    (error instanceof Error ? error.message : "errore sconosciuto"),
        variant: "destructive",
      });
    },
  });

  // Funzione per la gestione dell'invio del form del profilo
  const onSubmitProfile = (data: z.infer<typeof updateProfileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  // Funzione per la gestione dell'invio del form della password
  const onSubmitPassword = (data: z.infer<typeof updatePasswordSchema>) => {
    updatePasswordMutation.mutate({ password: data.password });
  };

  // Handler per il cambio password che traccia la complessità
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    
    // Semplice calcolo della forza della password
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.match(/[A-Z]/)) strength += 1;
    if (password.match(/[0-9]/)) strength += 1;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 1;
    
    setPasswordStrength(strength);
    passwordForm.setValue("password", password);
  };

  // Funzione per il logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Visualizza un indicatore di caricamento se i dati utente stanno caricando
  if (isUserLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calcolo delle iniziali per l'avatar
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map(part => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : 'U';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Il tuo Account</CardTitle>
        <CardDescription>
          Gestisci le impostazioni del tuo account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-medium">
            {initials}
          </div>
          <div>
            <h3 className="font-medium">{user?.fullName || "Utente"}</h3>
            <p className="text-sm text-gray-500">{user?.email || "email@example.com"}</p>
            <div className="flex items-center mt-1">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
              <span className="text-xs text-gray-500">
                {user?.role === "admin" ? "Amministratore" : "Utente"}
              </span>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-medium mb-4">Informazioni Personali</h3>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Mario Rossi" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email" 
                        placeholder="mario.rossi@example.com" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="mt-2"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Save className="mr-2 h-4 w-4" />
                    Salva Modifiche
                  </span>
                )}
              </Button>
            </form>
          </Form>
        </div>
        
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-medium mb-4">Sicurezza</h3>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuova Password</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        onChange={handlePasswordChange}
                      />
                    </FormControl>
                    <PasswordStrengthMeter strength={passwordStrength} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conferma Password</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="password" 
                        placeholder="••••••••" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="mt-2"
                disabled={updatePasswordMutation.isPending}
              >
                {updatePasswordMutation.isPending ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aggiornamento...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Aggiorna Password
                  </span>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button 
          variant="outline" 
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uscita...
            </span>
          ) : (
            <span className="flex items-center">
              <LogOut className="mr-2 h-4 w-4" />
              Esci
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}