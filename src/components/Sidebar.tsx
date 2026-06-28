import { Home, PlusCircle, History, BarChart3, LogOut, User, ShieldCheck } from "lucide-react";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  user: { email: string; name: string; role: "citizen" | "authority" };
  onLogout: () => void;
}

export default function Sidebar({ currentTab, onTabChange, user, onLogout }: SidebarProps) {
  const isAuthority = user.role === "authority";

  const navigationItems = [
    {
      id: "home",
      label: "Home Dashboard",
      icon: Home,
      allowedRoles: ["citizen"]
    },
    {
      id: "report",
      label: "Report Issue",
      icon: PlusCircle,
      allowedRoles: ["citizen"]
    },
    {
      id: "history",
      label: "Complaint History",
      icon: History,
      allowedRoles: ["citizen", "authority"]
    },
    {
      id: "authority",
      label: "Authority Portal",
      icon: BarChart3,
      allowedRoles: ["authority"]
    }
  ];

  const visibleItems = navigationItems.filter(item => item.allowedRoles.includes(user.role));

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col justify-between border-r border-slate-800" id="sidebar">
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-800" id="sidebar-logo-container">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/20" id="sidebar-icon-container">
            <PlusCircle className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-md font-bold text-slate-100 tracking-tight leading-none" id="sidebar-brand-title">CommunityHero</h1>
            <span className="text-[10px] text-teal-400 font-semibold tracking-wider uppercase" id="sidebar-brand-badge">Civic Space</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto" id="sidebar-nav">
        {visibleItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              id={`sidebar-nav-${item.id}`}
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/10 font-semibold" 
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <IconComponent className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40" id="sidebar-footer">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/40 border border-slate-800/50 mb-3" id="sidebar-user-card">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-teal-400 font-bold" id="sidebar-user-avatar">
            {isAuthority ? <ShieldCheck className="w-5 h-5" /> : <User className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1" id="sidebar-user-details">
            <h4 className="text-xs font-semibold text-slate-200 truncate leading-tight">{user.name}</h4>
            <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">{user.email}</p>
            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-1.5 ${
              isAuthority 
                ? "bg-purple-500/10 text-purple-300 border border-purple-500/20" 
                : "bg-teal-500/10 text-teal-300 border border-teal-500/20"
            }`}>
              {isAuthority ? "AUTHORITY" : "CITIZEN"}
            </span>
          </div>
        </div>

        <button
          id="sidebar-logout-btn"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-red-950/30 hover:text-red-300 hover:border-red-900/30 text-slate-400 text-xs font-medium rounded-lg border border-transparent transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
