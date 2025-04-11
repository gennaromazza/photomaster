import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

// Schema di validazione per il login
const loginSchema = z.object({
  username: z.string().min(1, "Nome utente richiesto"),
  password: z.string().min(1, "Password richiesta"),
});

// Schema di validazione per la registrazione
const registerSchema = z.object({
  username: z.string().min(3, "Nome utente deve essere almeno 3 caratteri").max(50),
  password: z.string().min(6, "Password deve essere almeno 6 caratteri").max(100),
  fullName: z.string().min(3, "Nome completo deve essere almeno 3 caratteri").max(100),
  email: z.string().email("Email non valida"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [, setLocation] = useLocation();

  // Form per il login
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Form per la registrazione
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
    },
  });

  // Funzione per gestire il login
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  // Funzione per gestire la registrazione
  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  // Reindirizza alla home se l'utente è autenticato
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center">
      <div className="container grid lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-playfair font-bold tracking-tight">
              Studio Arte Fotografia
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl">
              Sistema di gestione professionale per il tuo studio fotografico. Gestisci i clienti, gli eventi e i contratti in un'unica piattaforma elegante.
            </p>
          </div>

          <Card className="w-full max-w-lg mx-auto lg:mx-0">
            <CardHeader>
              <CardTitle className="text-2xl font-playfair">Accedi al tuo account</CardTitle>
              <CardDescription>
                Inserisci le tue credenziali per accedere o crea un nuovo account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Accedi</TabsTrigger>
                  <TabsTrigger value="register">Registrati</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome utente</FormLabel>
                            <FormControl>
                              <Input placeholder="nome.cognome" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Accesso in corso...
                          </>
                        ) : (
                          "Accedi"
                        )}
                      </Button>
                      <div className="text-center mt-2">
                        <Button variant="link" size="sm" className="p-0" onClick={() => setLocation("/forgot-password")}>
                          Password dimenticata?
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Mario Rossi" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="mario.rossi@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome utente</FormLabel>
                            <FormControl>
                              <Input placeholder="mario.rossi" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registrazione in corso...
                          </>
                        ) : (
                          "Registrati"
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="text-center text-sm text-muted-foreground">
              {activeTab === "login" ? (
                <p className="w-full">
                  Non hai un account?{" "}
                  <Button variant="link" className="p-0" onClick={() => setActiveTab("register")}>
                    Registrati ora
                  </Button>
                </p>
              ) : (
                <p className="w-full">
                  Hai già un account?{" "}
                  <Button variant="link" className="p-0" onClick={() => setActiveTab("login")}>
                    Accedi
                  </Button>
                </p>
              )}
            </CardFooter>
          </Card>
        </div>

        <div className="hidden lg:block">
          <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent z-10" />
            <div className="absolute top-0 left-0 p-6 z-20">
              <div className="text-white space-y-2">
                <h2 className="text-3xl font-playfair font-bold">Gestione completa del tuo studio</h2>
                <p className="opacity-90 max-w-md">
                  Calendario eventi, gestione clienti, contratti online e molto altro per il tuo studio fotografico.
                </p>
              </div>
            </div>
            <img
              src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1470&auto=format&fit=crop"
              alt="Studio fotografico"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}