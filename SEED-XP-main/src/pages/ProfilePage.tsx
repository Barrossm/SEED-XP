import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import UserProfileView from "@/components/UserProfileView";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const ProfilePage: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  if (!profile || !user) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6">
      <UserProfileView userId={user.id} />
      <Button variant="outline" onClick={signOut} className="w-full">
        <LogOut className="w-4 h-4 mr-2" /> Sair
      </Button>
    </div>
  );
};

export default ProfilePage;
