import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BitsBadge from "@/components/BitsBadge";

const areaOptions = [
  { v: "negocios", l: "Negócios" },
  { v: "projetos", l: "Projetos" },
  { v: "operacoes", l: "Operações" },
];

const MissionsTab: React.FC = () => {
  const qc = useQueryClient();

  const { data: missions } = useQuery({
    queryKey: ["admin-missions"],
    queryFn: async () => (await supabase.from("missions").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async (m: any) => {
      if (m.id) {
        const { error } = await supabase.from("missions").update({
          title: m.title, description: m.description, area: m.area,
          bits_reward: m.bits_reward, is_active: m.is_active,
        }).eq("id", m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("missions").insert({
          title: m.title, description: m.description, area: m.area,
          bits_reward: m.bits_reward, is_active: m.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-missions"] }); toast.success("Missão salva."); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-missions"] }); toast.success("Excluída."); },
  });

  return (
    <div className="space-y-3">
      <MissionDialog
        trigger={<Button className="w-full bg-primary-blue text-primary-blue-foreground hover:bg-primary-blue/90"><Plus className="w-4 h-4 mr-1" /> Nova missão</Button>}
        onSave={(m) => upsert.mutate(m)}
      />
      {missions?.map((m: any) => (
        <div key={m.id} className={`card-surface p-4 space-y-2 ${!m.is_active ? "opacity-60" : ""}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-primary">{m.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{m.area}{!m.is_active && " · arquivada"}</p>
              {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
            </div>
            <BitsBadge amount={m.bits_reward} />
          </div>
          <div className="flex gap-1 justify-end">
            <MissionDialog
              initial={m}
              trigger={<Button variant="ghost" size="icon"><Edit2 className="w-4 h-4" /></Button>}
              onSave={(updated) => upsert.mutate({ ...updated, id: m.id })}
            />
            <Button variant="ghost" size="icon"
              onClick={() => { if (confirm("Excluir missão?")) remove.mutate(m.id); }}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const MissionDialog: React.FC<{ trigger: React.ReactNode; initial?: any; onSave: (m: any) => void }> = ({ trigger, initial, onSave }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [area, setArea] = useState(initial?.area ?? "negocios");
  const [bits, setBits] = useState<number>(initial?.bits_reward ?? 10);
  const [active, setActive] = useState<boolean>(initial?.is_active ?? true);

  const submit = () => {
    if (!title.trim()) { toast.error("Título obrigatório"); return; }
    onSave({ title, description, area, bits_reward: bits, is_active: active });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar missão" : "Nova missão"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Área</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{areaOptions.map((a) => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Bits</Label><Input type="number" min={1} value={bits} onChange={(e) => setBits(Number(e.target.value))} /></div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativa</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter><Button onClick={submit} className="bg-primary-blue text-primary-blue-foreground hover:bg-primary-blue/90">Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MissionsTab;