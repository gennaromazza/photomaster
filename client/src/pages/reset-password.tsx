import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Schema di validazione per il reset della password
const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "La password deve essere almeno di 6 caratteri"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non corrispondono",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const RequestResetForm = () => {
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const handleRedirect = () => {
    setIsRedirecting(true);
    setTimeout(() => {
      window.location.href = "/forgot-password";
    }, 1000);
  };
  
  return (
    <div className="space-y-4">
      <Alert className="mb-4">
        <AlertTitle>Link non valido o scaduto</AlertTitle>
        <AlertDescription>
          Per reimpostare la password è necessario un link valido. Richiedi un nuovo link per il reset della password.
        </AlertDescription>
      </Alert>
      <Button className="w-full" onClick={handleRedirect} disabled={isRedirecting}>
        {isRedirecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Reindirizzamento...
          </>
        ) : (
          "Richiedi un nuovo link"
        )}
      </Button>
    </div>
  );
};

export default function ResetPasswordPage() {
  const params = useParams();
  const token = params.token;
  const [, setLocation] = useLocation();
  const [isSuccess, setIsSuccess] = useState(false);

  // Form per il reset della password
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormValues) => {
      const res = await apiRequest("POST", "/api/reset-password", {
        token,
        password: data.password,
      });
      return await res.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      // Redirect alla pagina di login dopo 3 secondi
      setTimeout(() => {
        setLocation("/auth");
      }, 3000);
    },
  });

  // Funzione per gestire l'invio del form
  const onSubmit = (data: ResetPasswordFormValues) => {
    resetPasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center">
      <div className="container flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-playfair">Reimposta la tua password</CardTitle>
            <CardDescription>
              {token ? "Inserisci la nuova password per il tuo account" : "Richiedi un nuovo link per reimpostare la password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <Alert className="mb-4">
                <AlertTitle>Password aggiornata</AlertTitle>
                <AlertDescription>
                  La tua password è stata reimpostata con successo. Sarai reindirizzato alla pagina di accesso.
                </AlertDescription>
              </Alert>
            ) : token ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nuova Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conferma Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
                    {resetPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Aggiornamento in corso...
                      </>
                    ) : (
                      "Reimposta Password"
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <RequestResetForm />
            )}
          </CardContent>
          <CardFooter className="text-center">
            <Link href="/auth" className="w-full">
              <Button variant="link" className="w-full">
                Torna alla pagina di accesso
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}