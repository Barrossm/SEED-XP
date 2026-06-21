import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TagChip from "@/components/TagChip";
import { Plus, X, Trash2 } from "lucide-react";

const areaOptions = [
  { v: "negocios", l: "Negócios" },
  { v: "projetos", l: "Projetos" },
  { v: "operacoes", l: "Operações" },
];

const UsersTab: React.FC = () => {
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "user_id, full_name, username, area, group_id, total_bits, groups(name)",
        )
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () =>
      (await supabase.from("groups").select("id, name").order("name")).data ??
      [],
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () =>
      (await supabase.from("tags").select("*").order("name")).data ?? [],
  });

  const update = useMutation({
    mutationFn: async ({ userId, patch }: { userId: string; patch: any }) => {
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Atualizado.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grantTag = useMutation({
    mutationFn: async ({
      userId,
      tagId,
    }: {
      userId: string;
      tagId: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("user_tags").insert({
        user_id: userId,
        tag_id: tagId,
        granted_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["user-tags-admin", v.userId] });
      toast.success("Tag atribuída.");
    },
    onError: (e: any) => {
      if (e.code === "23505") toast.error("Usuário já tem essa tag");
      else toast.error(e.message);
    },
  });

  const revokeTag = useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase.from("user_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["user-tags-admin", v.userId] }),
  });

  // NOVA MUTATION: Deletar usuário do sistema (Com correção de tipo TypeScript)
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("delete_user_by_admin" as any, {
        target_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário removido do sistema com sucesso!");
    },
    onError: (e: any) => toast.error("Erro ao remover usuário: " + e.message),
  });

  // Função de confirmação para segurança
  const handleDelete = (userId: string, userName: string) => {
    if (
      window.confirm(
        `ALERTA VERMELHO! 🚨\n\nTem certeza que deseja BANIR o usuário ${userName} do sistema?\nIsso apagará o login e o perfil permanentemente.`,
      )
    ) {
      deleteUser.mutate(userId);
    }
  };

  return (
    <div className="space-y-3">
      {users?.map((u: any) => (
        <UserRow
          key={u.user_id}
          user={u}
          groups={groups ?? []}
          tags={tags ?? []}
          onUpdate={(patch) => update.mutate({ userId: u.user_id, patch })}
          onGrant={(tagId) => grantTag.mutate({ userId: u.user_id, tagId })}
          onRevoke={(id) => revokeTag.mutate({ id, userId: u.user_id })}
          onDelete={() => handleDelete(u.user_id, u.full_name)}
          isDeleting={deleteUser.isPending}
        />
      ))}
    </div>
  );
};

const UserRow: React.FC<{
  user: any;
  groups: any[];
  tags: any[];
  onUpdate: (patch: any) => void;
  onGrant: (tagId: string) => void;
  onRevoke: (id: string) => void;
  onDelete: () => void;
  isDeleting: boolean;
}> = ({
  user,
  groups,
  tags,
  onUpdate,
  onGrant,
  onRevoke,
  onDelete,
  isDeleting,
}) => {
  const { data: userTags } = useQuery({
    queryKey: ["user-tags-admin", user.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_tags")
        .select("id, tags(*)")
        .eq("user_id", user.user_id);
      return data ?? [];
    },
  });

  return (
    <div className="card-surface p-4 space-y-3 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-primary truncate">
            {user.full_name ?? "(sem nome)"}
          </p>
          <p className="text-xs text-primary-blue">@{user.username ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {user.total_bits} Bits
          </p>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
          className="shrink-0"
        >
          <Trash2 className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Banir</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={user.area ?? ""}
          onValueChange={(v) => onUpdate({ area: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            {areaOptions.map((a) => (
              <SelectItem key={a.v} value={a.v}>
                {a.l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={user.group_id ?? "none"}
          onValueChange={(v) => onUpdate({ group_id: v === "none" ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem grupo</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {userTags?.map((ut: any) => (
          <div key={ut.id} className="inline-flex items-center gap-1">
            <TagChip tag={ut.tags} />
            <button
              onClick={() => onRevoke(ut.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              <Plus className="w-3 h-3 mr-1" />
              Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir tag a {user.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {tags.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => onGrant(t.id)}
                  className="w-full text-left card-surface p-3 hover:border-primary-blue transition"
                >
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <span className="font-semibold text-primary">{t.name}</span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UsersTab;
