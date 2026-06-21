import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import BitsBadge from "@/components/BitsBadge";

const ApprovalsTab: React.FC = () => {
  const qc = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ["admin-pending"],
    queryFn: async () => {
      const { data: completions, error } = await supabase
        .from("mission_completions")
        .select("*, missions(title, bits_reward)")
        .eq("status", "pending")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set(completions.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", userIds);
      const m = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return completions.map((c) => ({ ...c, profile: m.get(c.user_id) }));
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("approve_mission", { completion_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
      qc.invalidateQueries({ queryKey: ["leaderboard-admin"] });
      toast.success("Missão aprovada — Bits creditados.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mission_completions")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
      toast.success("Missão rejeitada.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground text-center py-6">Carregando…</p>;

  return (
    <div className="space-y-3">
      {pending?.map((c: any) => (
        <div key={c.id} className="card-surface p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-primary">{c.profile?.full_name ?? "—"}</p>
              <p className="text-xs text-primary-blue">@{c.profile?.username}</p>
              <p className="text-sm text-muted-foreground mt-1">{c.missions?.title}</p>
            </div>
            <div className="text-right space-y-1">
              <BitsBadge amount={c.missions?.bits_reward ?? 0} />
              <Clock className="w-4 h-4 text-muted-foreground ml-auto" />
            </div>
          </div>

          {c.proof_image_url && (
            <Dialog>
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-1.5 text-sm text-primary-blue hover:underline">
                  <ImageIcon className="w-4 h-4" /> Ver comprovante
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <img src={c.proof_image_url} alt="Comprovante" className="w-full rounded-lg" />
              </DialogContent>
            </Dialog>
          )}

          <div className="flex gap-2">
            <Button onClick={() => approve.mutate(c.id)} disabled={approve.isPending}
              size="sm" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
            </Button>
            <Button variant="outline" onClick={() => reject.mutate(c.id)} disabled={reject.isPending}
              size="sm" className="flex-1">
              <XCircle className="w-4 h-4 mr-1" /> Rejeitar
            </Button>
          </div>
        </div>
      ))}
      {(!pending || pending.length === 0) && (
        <p className="text-muted-foreground text-center py-8">Nenhuma missão pendente.</p>
      )}
    </div>
  );
};

export default ApprovalsTab;