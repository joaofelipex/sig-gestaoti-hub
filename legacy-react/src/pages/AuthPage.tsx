import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import imtsLogo from "@/assets/imts-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/components/auth/AuthProvider";

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

const signUpSchema = signInSchema.extend({
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  organizacao: z.string().trim().min(2, "Informe a organização").max(80),
});

export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, from, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast({ title: "Verifique os dados", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Não foi possível entrar",
        description: error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Bem-vindo de volta!" });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      nome: fd.get("nome"),
      organizacao: fd.get("organizacao"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast({ title: "Verifique os dados", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome: parsed.data.nome, organizacao: parsed.data.organizacao },
      },
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Não foi possível cadastrar",
        description: error.message.includes("already registered")
          ? "Este e-mail já está cadastrado. Faça login."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Conta criada", description: "Sua organização foi provisionada. Você já está logado." });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img
            src={imtsLogo}
            alt="IMTS - IT Management System"
            width={160}
            height={160}
            className="w-32 h-32 object-contain drop-shadow-lg"
          />
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mt-1">IT Management System</p>
          <p className="text-sm text-muted-foreground mt-2">Acesse sua organização</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full mb-5">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email">E-mail</Label>
                  <Input id="signin-email" name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signin-password">Senha</Label>
                  <Input id="signin-password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-nome">Seu nome</Label>
                  <Input id="signup-nome" name="nome" required placeholder="Felipe Miranda" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-org">Organização</Label>
                  <Input id="signup-org" name="organizacao" required placeholder="IMTS Group" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input id="signup-email" name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" name="password" type="password" autoComplete="new-password" required placeholder="Mínimo 6 caracteres" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar conta e organização"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Multi-tenant: cada cadastro cria uma organização isolada.
        </p>
      </div>
    </div>
  );
}
