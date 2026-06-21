import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BitsBadge from "@/components/BitsBadge";
import { Trophy } from "lucide-react";

const LeaderboardTab: React.FC = () => {
  const { data: top } = useQuery({
    queryKey: ["leaderboard-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, total_bits, avatar_url, groups(name)")
        .order("total_bits", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-3">
      <div className="card-surface p-4 flex items-center gap-3">
        <Trophy className="w-5 h-5 text-accent" />
        <p className="text-sm text-muted-foreground">
          Ranking visível apenas para administradores.
        </p>
      </div>
      {top?.map((p: any, i: number) => (
        <div key={p.user_id} className="card-surface p-3 flex items-center gap-3">
          <span className={`w-7 text-center font-display font-extrabold ${i < 3 ? "text-primary-blue" : "text-muted-foreground"}`}>
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary truncate">{p.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {p.username && <>@{p.username}</>}{p.groups?.name && <> · {p.groups.name}</>}
            </p>
          </div>
          <BitsBadge amount={p.total_bits} />
        </div>
      ))}
    </div>
  );
};

export default LeaderboardTab;