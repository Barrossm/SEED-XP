import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PostComposer from "@/components/PostComposer";
import PostCard, { PostData } from "@/components/PostCard";

const FeedPage: React.FC = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, content, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!data) return [];
      const userIds = [...new Set(data.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", userIds);
      const map = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return data.map((p) => ({
        ...p,
        author: map.get(p.user_id) ?? { full_name: "Usuário", username: null, avatar_url: null },
      })) as PostData[];
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-primary">Feed</h1>
        <p className="text-sm text-muted-foreground">Compartilhe conquistas e reconheça colegas.</p>
      </div>

      <PostComposer />

      {isLoading ? (
        <p className="text-muted-foreground text-center py-6">Carregando…</p>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-6">Ainda não há publicações. Seja o primeiro!</p>
      )}
    </div>
  );
};

export default FeedPage;