import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BitsBadge from "@/components/BitsBadge";
import { Trophy, TrendingUp, Users } from "lucide-react";

const DashboardTab: React.FC = () => {
  // Top usuários
  const { data: topUsers } = useQuery({
    queryKey: ["dash-top-users"],
    queryFn: async () => (await supabase
      .from("profiles")
      .select("user_id, full_name, username, total_bits")
      .order("total_bits", { ascending: false })
      .limit(10)).data ?? [],
  });

  // Ranking de grupos = soma de bits dos integrantes
  const { data: groupsRanking } = useQuery({
    queryKey: ["dash-groups"],
    queryFn: async () => {
      const { data: groups } = await supabase.from("groups").select("id, name");
      const { data: profiles } = await supabase.from("profiles").select("group_id, total_bits");
      const map = new Map<string, number>();
      (profiles ?? []).forEach((p) => {
        if (!p.group_id) return;
        map.set(p.group_id, (map.get(p.group_id) ?? 0) + p.total_bits);
      });
      const memberCount = new Map<string, number>();
      (profiles ?? []).forEach((p) => {
        if (!p.group_id) return;
        memberCount.set(p.group_id, (memberCount.get(p.group_id) ?? 0) + 1);
      });
      return (groups ?? [])
        .map((g) => ({ ...g, total_bits: map.get(g.id) ?? 0, members: memberCount.get(g.id) ?? 0 }))
        .sort((a, b) => b.total_bits - a.total_bits);
    },
  });

  // Evolução temporal: missões aprovadas dos últimos 7 e 30 dias, por grupo
  const { data: timeline } = useQuery({
    queryKey: ["dash-timeline"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data: completions } = await supabase
        .from("mission_completions")
        .select("user_id, reviewed_at, missions(bits_reward)")
        .eq("status", "approved")
        .gte("reviewed_at", since);
      const { data: profiles } = await supabase.from("profiles").select("user_id, group_id");
      const { data: groups } = await supabase.from("groups").select("id, name");
      const groupByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.group_id]));
      const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 3600 * 1000;
      const stats = new Map<string, { week: number; month: number }>();
      (completions ?? []).forEach((c: any) => {
        const gid = groupByUser.get(c.user_id);
        if (!gid) return;
        const bits = c.missions?.bits_reward ?? 0;
        const t = new Date(c.reviewed_at).getTime();
        const cur = stats.get(gid) ?? { week: 0, month: 0 };
        cur.month += bits;
        if (t >= weekAgo) cur.week += bits;
        stats.set(gid, cur);
      });
      return [...stats.entries()].map(([gid, v]) => ({
        name: groupName.get(gid) ?? "—",
        ...v,
      })).sort((a, b) => b.month - a.month);
    },
  });

  const maxMonth = Math.max(1, ...(timeline?.map((t) => t.month) ?? [1]));
  const maxGroup = Math.max(1, ...(groupsRanking?.map((g) => g.total_bits) ?? [1]));

  return (
    <div className="space-y-5">
      {/* Ranking de grupos */}
      <section className="card-surface p-5 space-y-3">
        <h2 className="font-display font-bold text-primary flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" /> Ranking de grupos (Bits acumulados)
        </h2>
        <div className="space-y-2">
          {groupsRanking?.map((g, i) => (
            <div key={g.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-semibold text-primary">{i + 1}. {g.name}</span>
                <span className="text-muted-foreground">{g.total_bits} Bits · {g.members} membro(s)</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary-blue" style={{ width: `${(g.total_bits / maxGroup) * 100}%` }} />
              </div>
            </div>
          ))}
          {(!groupsRanking || groupsRanking.length === 0) && (
            <p className="text-sm text-muted-foreground">Nenhum grupo cadastrado.</p>
          )}
        </div>
      </section>

      {/* Evolução temporal */}
      <section className="card-surface p-5 space-y-3">
        <h2 className="font-display font-bold text-primary flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" /> Evolução por grupo (últimos 30 dias)
        </h2>
        <div className="space-y-3">
          {timeline?.map((t, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-semibold text-primary">{t.name}</span>
                <span className="text-muted-foreground">
                  Semana: <b className="text-primary">{t.week}</b> · Mês: <b className="text-primary">{t.month}</b>
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
                <div className="h-full bg-accent" style={{ width: `${(t.week / maxMonth) * 100}%` }} />
                <div className="h-full bg-primary-blue/40" style={{ width: `${((t.month - t.week) / maxMonth) * 100}%` }} />
              </div>
            </div>
          ))}
          {(!timeline || timeline.length === 0) && (
            <p className="text-sm text-muted-foreground">Sem atividade nos últimos 30 dias.</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Verde-limão: semana atual · Azul: restante do mês.
        </p>
      </section>

      {/* Top usuários */}
      <section className="card-surface p-5 space-y-3">
        <h2 className="font-display font-bold text-primary flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" /> Top 10 indivíduos
        </h2>
        <div className="space-y-2">
          {topUsers?.map((u: any, i) => (
            <div key={u.user_id} className="flex items-center justify-between text-sm">
              <span><b className="text-primary">{i + 1}.</b> {u.full_name} <span className="text-primary-blue">@{u.username}</span></span>
              <BitsBadge amount={u.total_bits} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardTab;