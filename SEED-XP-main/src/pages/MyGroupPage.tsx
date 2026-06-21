import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Trophy, Award } from "lucide-react";

const MyGroupPage: React.FC = () => {
  const { user } = useAuth();

  // 1. Puxa as informações do grupo do usuário logado (agora trazendo avatar_url)
  const { data: userProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ["user-group-info", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("group_id, groups(name, avatar_url)") // Buscando o avatar_url do grupo aqui!
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const groupId = userProfile?.group_id;
  const groupName = (userProfile as any)?.groups?.name;
  const groupAvatar = (userProfile as any)?.groups?.avatar_url;

  // 2. Puxa todos os membros que estão nesse mesmo grupo, ordenando por Bits
  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url, total_bits")
        .eq("group_id", groupId)
        .order("total_bits", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  if (loadingProfile || loadingMembers) {
    return (
      <p className="text-muted-foreground text-center py-6">
        Carregando squad...
      </p>
    );
  }

  if (!groupId) {
    return (
      <div className="card-surface p-6 text-center space-y-3">
        <Users className="w-12 h-12 text-muted-foreground/60 mx-auto" />
        <h2 className="text-xl font-display font-bold text-primary">
          Sem grupo definido
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Você ainda não está vinculado a nenhum grupo. Peça para o
          Administrador do sistema te encaixar em um time!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* CABEÇALHO DO GRUPO ADAPTADO PARA FOTO */}
      <div className="card-surface p-6 bg-gradient-to-r from-primary-blue/10 to-transparent border-l-4 border-l-primary-blue">
        <div className="flex items-center gap-4">
          {groupAvatar ? (
            <img
              src={groupAvatar}
              alt={groupName}
              className="w-14 h-14 rounded-xl object-cover border border-border shadow-sm shrink-0"
            />
          ) : (
            <div className="p-3 bg-primary-blue rounded-xl text-primary-blue-foreground shrink-0">
              <Users className="w-6 h-6" />
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-blue">
              Meu Grupo
            </p>
            <h1 className="text-2xl font-display font-extrabold text-primary leading-tight">
              {groupName ?? "Nome do Grupo"}
            </h1>
          </div>
        </div>
      </div>

      {/* QUADRO DOS MEMBROS / RANKING DO TIME */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-accent" /> Classificação do Time
        </h2>

        <div className="space-y-2">
          {members?.map((member: any, index: number) => {
            const isTop1 = index === 0;
            const initials = (member.full_name ?? "?")
              .split(" ")
              .map((w: string) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div
                key={member.user_id}
                className={`card-surface p-4 flex items-center justify-between gap-3 transition-all ${
                  isTop1 ? "border-accent/40 bg-accent/5 shadow-sm" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`font-display font-extrabold text-sm w-5 text-center ${isTop1 ? "text-accent text-lg" : "text-muted-foreground"}`}
                  >
                    {index + 1}º
                  </span>

                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt=""
                      className={`w-10 h-10 rounded-full object-cover border-2 ${isTop1 ? "border-accent" : "border-border"}`}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center">
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-primary truncate flex items-center gap-1">
                      {member.full_name ?? "(Sem nome)"}
                      {isTop1 && (
                        <Award className="w-4 h-4 text-accent shrink-0" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.username ? `@${member.username}` : "—"}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-secondary-foreground">
                    {member.total_bits} Bits
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MyGroupPage;
