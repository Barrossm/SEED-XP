import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, Camera, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BitsBadge from "@/components/BitsBadge";

const areaLabel: Record<string, string> = {
  negocios: "Negócios",
  projetos: "Projetos",
  operacoes: "Operações",
};

const MissionsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingMissionId, setUploadingMissionId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: missions, isLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: completions } = useQuery({
    queryKey: ["my-completions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_completions")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const completeMission = useMutation({
    mutationFn: async ({ missionId, file }: { missionId: string; file: File }) => {
      // Upload proof image
      const fileExt = file.name.split(".").pop();
      const filePath = `${user!.id}/${missionId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("mission-proofs")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("mission-proofs")
        .getPublicUrl(filePath);

      // Insert completion with proof
      const { error } = await supabase
        .from("mission_completions")
        .insert({
          mission_id: missionId,
          user_id: user!.id,
          proof_image_url: urlData.publicUrl,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-completions"] });
      toast.success("Missão enviada para aprovação com comprovante!");
      setSelectedFile(null);
      setUploadingMissionId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao concluir missão");
    },
  });

  const getLatestStatus = (missionId: string) => {
    const matching = completions?.filter((c) => c.mission_id === missionId) ?? [];
    if (matching.length === 0) return undefined;
    // Sort by completed_at desc and return latest
    const sorted = [...matching].sort(
      (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );
    return sorted[0].status;
  };

  const canRetry = (missionId: string) => {
    const matching = completions?.filter((c) => c.mission_id === missionId) ?? [];
    if (matching.length === 0) return true;
    const latest = [...matching].sort(
      (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    )[0];
    // Can retry if latest was rejected or approved (repeatable)
    return latest.status === "rejected" || latest.status === "approved";
  };

  const statusIcon = (status: string | undefined) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-primary-blue" />;
      case "approved": return <CheckCircle className="w-4 h-4 text-primary" />;
      case "rejected": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  const statusLabel = (status: string | undefined) => {
    switch (status) {
      case "pending": return "Pendente";
      case "approved": return "Aprovada";
      case "rejected": return "Rejeitada";
      default: return null;
    }
  };

  const handleFileSelect = (missionId: string) => {
    setUploadingMissionId(missionId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    // Reset input
    e.target.value = "";
  };

  const handleSubmit = (missionId: string) => {
    if (!selectedFile) {
      toast.error("Envie um comprovante (foto) da missão!");
      return;
    }
    completeMission.mutate({ missionId, file: selectedFile });
  };

  // Group missions by area
  const areas = ["negocios", "projetos", "operacoes"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-primary">Missões</h1>
        <p className="text-sm text-muted-foreground">Conclua e envie comprovante para ganhar Bits.</p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {isLoading ? (
        <div className="text-muted-foreground text-center py-8">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {areas.map((area) => {
            const list = missions?.filter((m) => m.area === area) ?? [];
            if (list.length === 0) return null;
            return (
              <div key={area} className="space-y-3">
                <h2 className="text-base font-display font-bold text-primary">
                  <span className="lime-underline">{areaLabel[area]}</span>
                </h2>
                {list.map((m) => {
                  const status = getLatestStatus(m.id);
                  const retry = canRetry(m.id);
                  const isUploading = uploadingMissionId === m.id;
                  const completionCount = completions?.filter(
                    (c) => c.mission_id === m.id && c.status === "approved"
                  ).length ?? 0;

                  return (
                    <div key={m.id} className="card-surface p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-base text-primary">{m.title}</h3>
                            {completionCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {completionCount}x
                              </Badge>
                            )}
                          </div>
                          {m.description && (
                            <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                          )}
                        </div>
                        <div className="shrink-0"><BitsBadge amount={m.bits_reward} size="md" /></div>
                      </div>

                      {status === "pending" ? (
                        <div className="flex items-center gap-2 text-sm">
                          {statusIcon(status)}
                          <span className="text-muted-foreground">{statusLabel(status)}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {status && (
                            <div className="flex items-center gap-2 text-sm">
                              {statusIcon(status)}
                              <span className="text-muted-foreground">{statusLabel(status)}</span>
                            </div>
                          )}
                          {(retry || !status) && (
                            <>
                              {isUploading && selectedFile ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Camera className="w-4 h-4" />
                                    {selectedFile.name}
                                  </div>
                                  <Button
                                    onClick={() => handleSubmit(m.id)}
                                    disabled={completeMission.isPending}
                                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                                  >
                                    <Upload className="w-4 h-4 mr-1" /> Enviar Comprovante
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => handleFileSelect(m.id)}
                                  disabled={completeMission.isPending}
                                  className="w-full bg-primary-blue text-primary-blue-foreground hover:bg-primary-blue/90 font-semibold"
                                >
                                  <Camera className="w-4 h-4 mr-1" /> Concluir Missão
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {(!missions || missions.length === 0) && (
            <p className="text-muted-foreground text-center py-8">Nenhuma missão disponível.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MissionsPage;
