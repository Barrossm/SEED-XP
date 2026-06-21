import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react"; // Adicionado o Trash2
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // Adicionado o toast para avisos

export interface PostData {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

const renderContent = (text: string) => {
  const parts = text.split(/(@[a-zA-Z0-9_.]+|#[\p{L}0-9_]+)/gu);
  return parts.map((p, i) => {
    if (p.startsWith("@")) {
      const handle = p.slice(1);
      return (
        <Link
          key={i}
          to={`/u/${handle}`}
          className="text-primary-blue font-semibold hover:underline"
        >
          {p}
        </Link>
      );
    }
    if (p.startsWith("#")) {
      return (
        <span key={i} className="text-primary-blue font-semibold">
          {p}
        </span>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

const PostCard: React.FC<{ post: PostData }> = ({ post }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  // Puxa o perfil do usuário logado para checar se ele é admin por trás dos panos
  const { data: currentUserProfile } = useQuery({
    queryKey: ["current-user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Regra de segurança: é admin ou é o próprio autor do post?
  const isAdmin =
    (currentUserProfile as any)?.role === "admin" ||
    (currentUserProfile as any)?.is_admin === true;
  const canDelete = user?.id === post.user_id || isAdmin;

  const { data: likes } = useQuery({
    queryKey: ["post-likes", post.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", post.id);
      return data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["post-comments", post.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("id, user_id, content, created_at")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", userIds);
      const map = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return data.map((c) => ({ ...c, author: map.get(c.user_id) }));
    },
    enabled: showComments,
  });

  const liked = likes?.some((l) => l.user_id === user?.id) ?? false;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (liked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: post.id, user_id: user.id });
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["post-likes", post.id] }),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !comment.trim()) return;
      await supabase.from("post_comments").insert({
        post_id: post.id,
        user_id: user.id,
        content: comment.trim(),
      });
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["post-comments", post.id] });
    },
  });

  // MUTATION PARA EXCLUIR O POST DE VERDADE
  const deletePost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Publicação excluída com sucesso!");
    },
    onError: (e: any) => {
      toast.error("Erro ao excluir publicação: " + e.message);
    },
  });

  const handleDeleteClick = () => {
    if (
      window.confirm(
        "Deseja mesmo excluir esta publicação? Esta ação removerá o post permanentemente.",
      )
    ) {
      deletePost.mutate();
    }
  };

  const initials = (post.author.full_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <article className="card-surface p-4 space-y-3">
      {/* HEADER AJUSTADO PARA SUPORTAR O BOTÃO NA DIREITA */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link to={post.author.username ? `/u/${post.author.username}` : "#"}>
            {post.author.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-display font-bold flex items-center justify-center">
                {initials}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to={post.author.username ? `/u/${post.author.username}` : "#"}
              className="font-semibold text-primary hover:underline"
            >
              {post.author.full_name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {post.author.username && <>@{post.author.username} · </>}
              {timeAgo(post.created_at)}
            </p>
          </div>
        </div>

        {/* BOTÃO DA LIXEIRA DE MODERAÇÃO */}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteClick}
            disabled={deletePost.isPending}
            className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </header>

      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {renderContent(post.content)}
      </p>

      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          className="rounded-lg w-full max-h-96 object-cover"
        />
      )}

      <footer className="flex items-center gap-4 pt-1 border-t border-border">
        <button
          onClick={() => toggleLike.mutate()}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold ${liked ? "text-destructive" : "text-muted-foreground hover:text-primary"}`}
        >
          <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} />
          {likes?.length ?? 0}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <MessageCircle className="w-4 h-4" />
          Comentar
        </button>
      </footer>

      {showComments && (
        <div className="space-y-3 pt-2 border-t border-border">
          {comments?.map((c: any) => (
            <div key={c.id} className="text-sm">
              <Link
                to={c.author?.username ? `/u/${c.author.username}` : "#"}
                className="font-semibold text-primary hover:underline"
              >
                {c.author?.full_name ?? "Usuário"}
              </Link>{" "}
              <span className="text-foreground">
                {renderContent(c.content)}
              </span>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escreva um comentário…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addComment.mutate();
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => addComment.mutate()}
              disabled={!comment.trim()}
              className="bg-primary-blue text-primary-blue-foreground hover:bg-primary-blue/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;
