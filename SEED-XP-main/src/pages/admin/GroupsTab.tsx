import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Edit2,
  Trash2,
  Plus,
  Tag as TagIcon,
  Camera,
  Loader2,
  Users,
} from "lucide-react"; // Importados novos ícones

const GroupsTab: React.FC = () => {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: groups } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("*").order("name");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("groups").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-groups"] });
      setNewName("");
      toast.success("Grupo criado.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("groups")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-groups"] });
      toast.success("Atualizado.");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-groups"] });
      toast.success("Grupo excluído.");
    },
  });

  return (
    <div className="space-y-4">
      <div className="card-surface p-4 flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do novo grupo"
        />
        <Button
          onClick={() => newName.trim() && create.mutate(newName.trim())}
          className="bg-primary-blue text-primary-blue-foreground hover:bg-primary-blue/90"
        >
          <Plus className="w-4 h-4 mr-1" /> Criar
        </Button>
      </div>
      {groups?.map((g: any) => (
        <GroupRow
          key={g.id}
          group={g}
          onRename={(name) => rename.mutate({ id: g.id, name })}
          onDelete={() => remove.mutate(g.id)}
        />
      ))}
    </div>
  );
};

const GroupRow: React.FC<{
  group: any;
  onRename: (n: string) => void;
  onDelete: () => void;
}> = ({ group, onRename, onDelete }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [uploading, setUploading] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["group-members", group.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, username")
        .eq("group_id", group.id);
      return data ?? [];
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () =>
      (await supabase.from("tags").select("*").order("name")).data ?? [],
  });

  // MUTATION COMPLETA PARA FAZER UPLOAD DA FOTO DO GRUPO
  const uploadGroupAvatar = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `group-${group.id}.${fileExt}`;

      // Garante resiliência criando o bucket se necessário
      try {
        await supabase.storage.createBucket("avatars", {
          public: true,
          allowedMimeTypes: ["image/*"],
        });
      } catch (e) {}

      // Sobe o arquivo substituindo o antigo se houver
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Pega link público
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Salva o link na tabela de grupos
      const { error: updateError } = await supabase
        .from("groups")
        .update({ avatar_url: urlData.publicUrl } as any) // <-- Adicionado 'as any' aqui!
        .eq("id", group.id);

      if (updateError) throw updateError;
      return urlData.publicUrl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-groups"] });
      // Invalida a query do grupo do usuário logado para refletir a mudança instantaneamente
      qc.invalidateQueries({ queryKey: ["user-group-info"] });
      toast.success("Foto do grupo atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao carregar imagem: " + error.message);
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
    uploadGroupAvatar.mutate(file);
  };

  const grantToGroup = useMutation({
    mutationFn: async (tagId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const rows = (members ?? []).map((m) => ({
        user_id: m.user_id,
        tag_id: tagId,
        granted_by: user?.id,
      }));
      if (rows.length === 0) throw new Error("Grupo vazio");
      const { error } = await supabase
        .from("user_tags")
        .upsert(rows, { onConflict: "user_id,tag_id" });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Tag atribuída a todo o grupo."),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="card-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* COMPONENTE INTERATIVO DE COMPREENSÃO DE FOTO DO GRUPO */}
          <div className="relative shrink-0">
            {group.avatar_url ? (
              <img
                src={group.avatar_url}
                alt=""
                className="w-12 h-12 rounded-xl object-cover border border-border shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary-blue/10 text-primary-blue flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1 rounded-full cursor-pointer hover:bg-primary/90 shadow-sm transition-transform active:scale-95">
              {uploading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Camera className="w-3 h-3" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          </div>

          {editing ? (
            <div className="flex-1 flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <Button
                size="sm"
                onClick={() => {
                  onRename(name);
                  setEditing(false);
                }}
                className="bg-primary-blue text-primary-blue-foreground hover:bg-primary-blue/90"
              >
                Salvar
              </Button>
            </div>
          ) : (
            <h3 className="font-display font-bold text-primary truncate">
              {group.name}
            </h3>
          )}
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing((s) => !s)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`Excluir grupo "${group.name}"?`)) onDelete();
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <TagIcon className="w-4 h-4 text-accent-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Premiar grupo {group.name}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Atribui a mesma tag a todos os {members?.length ?? 0}{" "}
                integrantes.
              </p>
              <div className="space-y-2 mt-3">
                {tags?.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => grantToGroup.mutate(t.id)}
                    className="w-full text-left card-surface p-3 hover:border-primary-blue transition"
                  >
                    <div className="flex items-center gap-2">
                      <span>{t.icon}</span>
                      <span className="font-semibold text-primary">
                        {t.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {members?.length ?? 0} membro(s)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {members?.map((m) => (
          <span
            key={m.user_id}
            className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
          >
            {m.full_name ?? "—"}
          </span>
        ))}
      </div>
    </div>
  );
};

export default GroupsTab;
