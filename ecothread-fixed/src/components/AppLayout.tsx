import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Factory, ShoppingBag, Shield } from "lucide-react";

const navItems = [
  { to: "/", label: "Factory Manager", icon: Factory, emoji: "🏭" },
  { to: "/brand-buyer", label: "Brand Buyer", icon: ShoppingBag, emoji: "🛍️" },
  { to: "/admin", label: "Admin Panel", icon: Shield, emoji: "🛡️" },
] as const;

export function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-col justify-center border-b-2 border-mint-soft bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-coral">🌿 EcoThread AI</div>
          <div className="rounded-full bg-mint-soft px-4 py-1.5 text-sm font-semibold text-foreground">
            Live Audit System ✦
          </div>
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-gradient-to-r from-coral to-mint header-gradient-line" />
      </header>

      <div className="flex flex-1">
        <aside className="w-64 border-r border-mint-soft bg-white p-4">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-l-4 border-mint bg-mint-soft text-foreground"
                      : "border-l-4 border-transparent text-foreground/70 hover:bg-mint-soft/50"
                  }`}
                >
                  <Icon className="h-5 w-5 text-coral" />
                  <span>
                    <span className="mr-1">{item.emoji}</span>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8 animate-page-fade">
          <Outlet />
        </main>
      </div>

      <footer className="bg-coral px-6 py-4 text-center text-sm font-medium text-white">
        ✦ Aligned with Vision 2030 &amp; 2035 &nbsp;|&nbsp; SDG 12 &amp; SDG 13 &nbsp;|&nbsp; Data hosted on Kaggle ✦
      </footer>
    </div>
  );
}

export function PlaceholderCard({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-2xl border border-mint-soft bg-card px-12 py-16 text-center shadow-lg shadow-mint/10">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-3 text-muted-foreground">View placeholder — content coming soon.</p>
      </div>
    </div>
  );
}
