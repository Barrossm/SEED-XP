import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Logo from "@/components/Logo";

const OnboardingPage: React.FC = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [area, setArea] = useState<string>(profile?.area ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9_.]{3,20}$/.test(cleanUsername)) {
      toast.error("Username deve ter 3-20 caracteres (letras, números, _ ou .)");
      return;
    }
    if (!area) { toast.error("Escolha sua área de atuação"); return; }
    if (!fullName.trim()) { toast.error("Informe seu nome completo"); return; }

    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        username: cleanUsername,
        area: area as any,
        onboarded: true,
      })
      .eq("user_id", user.id);
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") toast.error("Esse @username já está em uso");
      else toast.error(error.message);
      return;
    }
    toast.success("Perfil completo! Bem-vindo(a) à Seed a Bit.");
    await refreshProfile();
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md card-surface p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center"><Logo size={48} /></div>
          <h1 className="text-2xl font-display font-extrabold text-primary">Complete seu perfil</h1>
          <p className="text-sm text-muted-foreground">Essas informações aparecem para o restante da equipe.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Nome de usuário</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input className="pl-7" placeholder="seunome"
                value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <p className="text-xs text-muted-foreground">3-20 caracteres • letras, números, _ ou .</p>
          </div>
          <div className="space-y-1.5">
            <Label>Área de atuação</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger><SelectValue placeholder="Selecione sua área" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="negocios">Negócios</SelectItem>
                <SelectItem value="projetos">Projetos</SelectItem>
                <SelectItem value="operacoes">Operações</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sua área só pode ser alterada por um administrador depois.
            </p>
          </div>

          <Button type="submit" disabled={submitting}
            className="w-full bg-primary-blue text-primary-blue-foreground hover:bg-primary-blue/90">
            {submitting ? "Salvando…" : "Concluir cadastro"}
          </Button>
        </form>

        <button onClick={signOut} className="w-full text-xs text-muted-foreground hover:text-primary">
          Sair
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;