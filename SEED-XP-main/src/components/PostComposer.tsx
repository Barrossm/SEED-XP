import React, { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Send, X } from "lucide-react";
import { toast } from "sonner";
import MentionInput from "@/components/MentionInput";

const PostComposer: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [mentioned, setMentioned] = useState<{ user_id: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
    e.target.value = "";
  };

  const reset = () => {
    setContent(""); setMentioned([]); setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      if (!content.trim()) throw new Error("Escreva algo antes de publicar");

      let imageUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("post-images").upload(path, file);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("post-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        imageUrl = signed?.signedUrl ?? null;
      }

      const { data: post, error } = await supabase
        .from("posts")
        .insert({ user_id: user.id, content: content.trim(), image_url: imageUrl })
        .select("id")
        .single();
      if (error) throw error;

      const hashtags = [...content.matchAll(/#([\p{L}0-9_]+)/gu)].map((m) => m[1].toLowerCase());
      if (hashtags.length) {
        await supabase.from("post_hashtags").insert(
          [...new Set(hashtags)].map((tag) => ({ post_id: post.id, tag }))
        );
      }
      if (mentioned.length) {
        await supabase.from("post_mentions").insert(
          mentioned.map((m) => ({ post_id: post.id, mentioned_user_id: m.user_id }))
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      reset();
      toast.success("Publicado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="card-surface p-4 space-y-3">
      <MentionInput
        value={content}
        onChange={(v, m) => { setContent(v); setMentioned(m); }}
        placeholder="Compartilhe uma conquista, marque colegas com @ e use #hashtags…"
        rows={3}
      />

      {preview && (
        <div className="relative">
          <img src={preview} alt="" className="rounded-lg max-h-64 w-full object-cover" />
          <button onClick={() => { setFile(null); URL.revokeObjectURL(preview); setPreview(null); }}
            className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => fileInput.current?.click()}
          className="inline-flex items-center gap-2 text-sm text-primary-blue font-semibold hover:underline">
          <ImageIcon className="w-4 h-4" /> Imagem
        </button>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={pickFile} />
        <Button onClick={() => create.mutate()} disabled={create.isPending || !content.trim()}
          className="bg-primary-blue text-primary-blue-foreground hover:bg-primary-blue/90">
          <Send className="w-4 h-4 mr-1" /> Publicar
        </Button>
      </div>
    </div>
  );
};

export default PostComposer;