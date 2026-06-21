import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import FeedPage from "@/pages/FeedPage";
import MissionsPage from "@/pages/MissionsPage";
import SearchPage from "@/pages/SearchPage";
import ProfilePage from "@/pages/ProfilePage";
import UserProfilePage from "@/pages/UserProfilePage";
import AdminPage from "@/pages/AdminPage";
import MyGroupPage from "@/pages/MyGroupPage";
import BottomNav from "@/components/BottomNav";
import NotFound from "@/pages/NotFound";
import Logo from "@/components/Logo";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Logo size={56} />
          <p className="text-muted-foreground">Carregando…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  // Bloqueia o app até completar onboarding
  if (profile && !profile.onboarded) {
    return <OnboardingPage />;
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden app-container">
      {/* INJEÇÃO DE ESTILO CORRIGIDA E MAIS FORTE */}
      <style>{`
        /* Mudamos para um Azul-Gelo mais escuro (#e2ebf5) para dar contraste real com os cards brancos */
        body, .min-h-screen, html, :root {
          background-color: #e2ebf5 !important;
        }
        /* Destaca os blocos brancos e adiciona uma borda azulada bem fina */
        .card-surface, [class*="card-surface"], .bg-card {
          background-color: #ffffff !important;
          border: 1px solid rgba(164, 189, 222, 0.5) !important;
          box-shadow: 0 10px 25px -5px rgba(30, 41, 59, 0.08), 0 8px 16px -6px rgba(30, 41, 59, 0.05) !important;
          border-radius: 1.25rem !important;
        }
      `}</style>

      {/* NEONS COM OPACIDADE TURBINADA (Subimos de 15% para 35% de força) */}
      {/* Aura Azul Forte no topo direito */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-primary-blue/35 rounded-full blur-[110px] pointer-events-none z-0" />

      {/* Aura Ciano/Accent no canto inferior esquerdo */}
      <div className="absolute bottom-[-50px] left-[-100px] w-[450px] h-[450px] bg-cyan-400/25 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Conteúdo principal */}
      <div className="max-w-2xl mx-auto px-4 py-6 relative z-10">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/group" element={<MyGroupPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/u/:username" element={<UserProfilePage />} />
          {isAdmin ? (
            <Route path="/admin/*" element={<AdminPage />} />
          ) : (
            <Route path="/admin/*" element={<Navigate to="/" replace />} />
          )}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
