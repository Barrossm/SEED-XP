import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BitsBadge from "@/components/BitsBadge";
import TagChip from "@/components/TagChip";
import { CheckCircle, Users, Camera, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const areaLabel: Record<string, string> = {
  negocios: "Negócios",
  projetos: "Projetos",
  operacoes: "Operações",
};

const UserProfileView: React.FC<{ userId: string }> = ({ userId }) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // ESTADOS DA BIO
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");

  const isOwnProfile = currentUser?.id === userId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, groups(name)")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["user-tags", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_tags")
        .select("tags(id, name, description, color, icon)")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.tags).filter(Boolean);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["user-stats", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("mission_completions")
        .select("status")
        .eq("user_id", userId);
      return {
        approved: data?.filter((c) => c.status === "approved").length ?? 0,
        pending: data?.filter((c) => c.status === "pending").length ?? 0,
      };
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["user-posts-count", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    },
  });

  // MUTATION PARA SALVAR A BIO NO SUPABASE
  const updateBio = useMutation({
    mutationFn: async (newBio: string) => {
      if (!currentUser) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update({ bio: newBio.trim() } as any) // as any aqui previne erro de tipo na escrita
        .eq("user_id", currentUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Biografia atualizada com sucesso!");
      setIsEditingBio(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar bio: " + error.message);
    },
  });

  // Mutation para upload de avatar
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!currentUser) throw new Error("Usuário não autenticado");

      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUser.id}.${fileExt}`;

      try {
        await supabase.storage.createBucket("avatars", {
          public: true,
          allowedMimeTypes: ["image/*"],
        });
      } catch (e) {}

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("user_id", currentUser.id);

      if (updateError) throw updateError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Foto de perfil atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar foto: " + error.message);
    },
    onSettled: () => setUploading(false),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }
    uploadAvatar.mutate(file);
  };

  const handleStartEditBio = () => {
    // Forçamos o 'as any' para ler o valor sem travar
    setBioText((profile as any)?.bio ?? "");
    setIsEditingBio(true);
  };

  if (isLoading || !profile)
    return <p className="text-muted-foreground">Carregando…</p>;

  const initials = (profile.full_name ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-5">
      <div className="card-surface p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? ""}
                className="w-20 h-20 rounded-full object-cover border-2 border-accent"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground font-display font-bold text-2xl flex items-center justify-center">
                {initials}
              </div>
            )}

            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-extrabold text-primary leading-tight">
              {profile.full_name}
            </h1>
            {profile.username && (
              <p className="text-sm text-primary-blue font-semibold">
                @{profile.username}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              {profile.area && (
                <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                  {areaLabel[profile.area]}
                </span>
              )}
              {(profile as any).groups?.name && (
                <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium inline-flex items-center gap-1">
                  <Users className="w-3 h-3" /> {(profile as any).groups.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* COMPONENTE INTERATIVO DA BIO COM TRAVA DE LEITURA (as any) */}
        <div className="text-sm border-t border-border/50 pt-2 pb-1">
          {isEditingBio ? (
            <div className="space-y-2">
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                placeholder="Conte um pouco sobre você, hobbies ou seu papel na empresa..."
                maxLength={150}
                className="w-full p-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue min-h-[70px] resize-none"
              />
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`${bioText.length >= 140 ? "text-destructive font-semibold" : "text-muted-foreground"}`}
                >
                  {bioText.length}/150 caracteres
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setIsEditingBio(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-primary-blue text-primary-blue-foreground"
                    onClick={() => updateBio.mutate(bioText)}
                    disabled={updateBio.isPending}
                  >
                    {updateBio.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {(profile as any).bio ? (
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {(profile as any).bio}
                </p>
              ) : (
                isOwnProfile && (
                  <p className="text-xs italic text-muted-foreground/60">
                    Você ainda não adicionou uma biografia.
                  </p>
                )
              )}

              {isOwnProfile && (
                <button
                  onClick={handleStartEditBio}
                  className="text-xs text-primary-blue font-semibold hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <Pencil className="w-3 h-3" />
                  {(profile as any).bio
                    ? "Editar biografia"
                    : "Adicionar biografia..."}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <div className="text-center">
            <p className="text-2xl font-display font-extrabold text-primary">
              {profile.total_bits}
            </p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Bits
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-extrabold text-primary">
              {stats?.approved ?? 0}
            </p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Missões
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-extrabold text-primary">
              {posts ?? 0}
            </p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Publicações
            </p>
          </div>
        </div>
      </div>

      {tags && tags.length > 0 && (
        <div className="card-surface p-5 space-y-3">
          <h2 className="font-display font-bold text-primary flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-accent" /> Conquistas
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t: any) => (
              <TagChip key={t.id} tag={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileView;
