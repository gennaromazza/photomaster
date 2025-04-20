import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, User, Heart } from "lucide-react";

const visitorSchema = z.object({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri").max(50),
  email: z.string().email("Inserisci un indirizzo email valido")
});

type VisitorFormData = z.infer<typeof visitorSchema>;

interface VisitorInfoFormProps {
  onSubmit: (data: VisitorFormData) => void;
  title?: string;
  description?: string;
}

export function VisitorInfoForm({ 
  onSubmit, 
  title = "I tuoi dati", 
  description = "Inserisci i tuoi dati per salvare le tue selezioni" 
}: VisitorInfoFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      name: "",
      email: ""
    }
  });

  const handleSubmit = async (data: VisitorFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      
      toast({
        title: "Dati salvati",
        description: "Grazie! Ora puoi salvare le tue selezioni"
      });
    } catch (error) {
      console.error("Errore nel salvataggio dei dati:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nel salvataggio dei dati",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500" />
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Il tuo nome</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-10" placeholder="Nome e cognome" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>La tua email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-10" placeholder="esempio@email.com" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : "Salva i miei dati"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}