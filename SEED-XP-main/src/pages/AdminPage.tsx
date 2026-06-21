import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ApprovalsTab from "@/pages/admin/ApprovalsTab";
import UsersTab from "@/pages/admin/UsersTab";
import GroupsTab from "@/pages/admin/GroupsTab";
import MissionsTab from "@/pages/admin/MissionsTab";
import TagsTab from "@/pages/admin/TagsTab";
import DashboardTab from "@/pages/admin/DashboardTab";
import LeaderboardTab from "@/pages/admin/LeaderboardTab";
import { Shield } from "lucide-react";

const AdminPage: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary-blue" />
        <h1 className="text-2xl font-display font-extrabold text-primary">Painel administrativo</h1>
      </div>

      <Tabs defaultValue="approvals" className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex w-auto">
            <TabsTrigger value="approvals">Aprovações</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="groups">Grupos</TabsTrigger>
            <TabsTrigger value="missions">Missões</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="approvals"><ApprovalsTab /></TabsContent>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="leaderboard"><LeaderboardTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="groups"><GroupsTab /></TabsContent>
        <TabsContent value="missions"><MissionsTab /></TabsContent>
        <TabsContent value="tags"><TagsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
