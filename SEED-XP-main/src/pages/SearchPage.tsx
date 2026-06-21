import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";

const SearchPage: React.FC = () => {
  const [q, setQ] = useState("");

  const { data: results } = useQuery({
    queryKey: ["user-search", q],
    queryFn: async () => {
      const term = q.trim().replace(/^@/, "");
      if (term.length < 1) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, full_name, avatar_url, area")
        .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-primary">Buscar pessoas</h1>
        <p className="text-sm text-muted-foreground">Encontre membros pelo nome ou @username.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou @username"
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="space-y-2">
        {results?.map((u: any) => {
          const initials = (u.full_name ?? "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
          return (
            <Link key={u.user_id} to={u.username ? `/u/${u.username}` : "#"}
              className="card-surface p-3 flex items-center gap-3 hover:border-primary-blue transition-colors">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-display font-bold flex items-center justify-center">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary truncate">{u.full_name}</p>
                {u.username && <p className="text-xs text-primary-blue">@{u.username}</p>}
              </div>
            </Link>
          );
        })}
        {q && (!results || results.length === 0) && (
          <p className="text-muted-foreground text-center text-sm py-6">Nenhum membro encontrado.</p>
        )}
      </div>
    </div>
  );
};

export default SearchPage;