import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UserProfileView from "@/components/UserProfileView";

const UserProfilePage: React.FC = () => {
  const { username } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!data) return <p className="text-muted-foreground">Usuário não encontrado.</p>;
  return <UserProfileView userId={data.user_id} />;
};

export default UserProfilePage;