import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import TagChip from "@/components/TagChip";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TagsTab: React.FC = () => {
  const qc = useQueryClient();
  const { data: tags } = useQuery({
    queryKey: ["admin-tags"],
    queryFn: async () => (await supabase.from("tags").select("*").order("name")).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async (t: any) => {
      if (t.id) {
        const { error } = await supabase.from("tags").update({
          name: t.name, description: t.description, color: t.color, icon: t.icon,
        }).eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tags").insert({
          name: t.name, description: t.description, color: t.color, icon: t.icon,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tags"] }); toast.success("Tag salva."); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tags"] }); toast.success("Excluída."); },
  });

  return (
    <div className="space-y-3">
      <TagDialog onSave={(t) => upsert.mutate(t)}
        trigger={<Button className="w-full bg-primary-blue text-primary-blue-foreground hover:bg-primary-blue/90"><Plus className="w-4 h-4 mr-1" /> Nova tag</Button>} />
      {tags?.map((t: any) => (
        <div key={t.id} className="card-surface p-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <TagChip tag={t} />
            {t.description && <p className="text-xs text-muted-foreground mt-2">{t.description}</p>}
          </div>
          <div className="flex gap-1">
            <TagDialog initial={t}
              trigger={<Button variant="ghost" size="icon"><Edit2 className="w-4 h-4" /></Button>}
              onSave={(u) => upsert.mutate({ ...u, id: t.id })} />
            <Button variant="ghost" size="icon"
              onClick={() => { if (confirm("Excluir tag?")) remove.mutate(t.id); }}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const TagDialog: React.FC<{ trigger: React.ReactNode; initial?: any; onSave: (t: any) => void }> = ({ trigger, initial, onSave }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? "#D8EA32");
  const [icon, setIcon] = useState(initial?.icon ?? "🏆");

  const submit = () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    onSave({ name, description, color, icon });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar tag" : "Nova tag"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Aparece como tooltip no perfil" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cor</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10" /></div>
            <div><Label>Ícone (emoji)</Label><Input value={icon} maxLength={2} onChange={(e) => setIcon(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit} className="bg-primary-blue text-primary-blue-foreground hover:bg-primary-blue/90">Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TagsTab;