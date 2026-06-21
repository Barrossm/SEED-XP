import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Swords, Search, User, Shield, Users } from "lucide-react"; // Adicionado Users aqui!
import { useAuth } from "@/contexts/AuthContext";

const userNav = [
  { to: "/", icon: Home, label: "Feed" },
  { to: "/missions", icon: Swords, label: "Missões" },
  { to: "/group", icon: Users, label: "Grupo" }, // Nova aba vinculada à rota /group!
  { to: "/search", icon: Search, label: "Buscar" },
  { to: "/profile", icon: User, label: "Perfil" },
];

const BottomNav: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();

  const items = isAdmin
    ? [...userNav, { to: "/admin", icon: Shield, label: "Admin" }]
    : userNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-50 shadow-[0_-2px_12px_rgba(6,52,114,0.06)]">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto">
        {items.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-primary-blue"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">{item.label}</span>
              {isActive && (
                <span className="block h-1 w-6 rounded-full bg-accent -mt-0.5" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
