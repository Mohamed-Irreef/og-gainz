import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  CalendarDays,
  UtensilsCrossed,
  Tag,
  ListChecks,
  Puzzle,
  Layers,
  Truck,
  Wallet,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/admin/meal-types", label: "Meal Types", icon: Tag },
  { href: "/admin/included-items", label: "Included Items", icon: ListChecks },
  { href: "/admin/byo-item-types", label: "BYO Item Types", icon: Layers },
  { href: "/admin/byo-items", label: "BYO Items", icon: Layers },
  { href: "/admin/byo-config", label: "BYO Minimums", icon: Settings },
  { href: "/admin/addon-categories", label: "Add-on Categories", icon: Tag },
  { href: "/admin/addons", label: "Add-ons", icon: Puzzle },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CalendarDays },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/kitchen", label: "Kitchen", icon: Truck },
  { href: "/admin/wallet", label: "Wallet & Credits", icon: Wallet },
  { href: "/admin/consultations", label: "Consultations", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useUser();

  // Admin shell uses independent scroll containers; prevent body/window scroll while mounted.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.height = '100%';
    body.style.height = '100%';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
    };
  }, []);

  const isAdmin = user?.role === 'admin';

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  return (
		<div className="h-screen flex bg-oz-neutral/20 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-oz-primary transform transition-transform duration-300 ease-in-out lg:transform-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
				<div className="h-screen overflow-y-auto scroll-smooth">
					<div className="flex flex-col min-h-full">
						{/* Sidebar Header */}
						<div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
							<Link to="/admin" className="flex items-center gap-2">
                <span className="text-white font-bold text-xl">OG GAINZ</span>
								<span className="text-xs bg-oz-accent text-white px-2 py-0.5 rounded font-medium">
									ADMIN
								</span>
							</Link>
							<Button
								variant="ghost"
								size="icon"
								className="lg:hidden text-white hover:bg-white/10"
								onClick={() => setSidebarOpen(false)}
							>
								<X className="h-5 w-5" />
							</Button>
						</div>

						{/* Navigation */}
						<nav className="flex-1 p-4 space-y-1">
            {isAdmin ? (
              adminLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
                    isActive(link.href)
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              ))
            ) : (
              <div className="px-4 py-3 rounded-lg bg-white/5 text-white/80 text-sm">
                Admin navigation is hidden because your role is not <span className="font-semibold text-white">admin</span>.
              </div>
            )}
						</nav>

						{/* Sidebar Footer */}
						<div className="p-4 border-t border-white/10">
							<Button
								variant="ghost"
								className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
								onClick={logout}
							>
								<LogOut className="h-5 w-5 mr-2" />
								Logout
							</Button>
						</div>
					</div>
				</div>
      </aside>

      {/* Main Content */}
			<div className="flex-1 min-w-0 h-screen overflow-hidden">
				<div className="h-full overflow-y-auto scroll-smooth">
					{/* Top Header (scrolls with content) */}
					<header className="h-16 bg-white border-b border-oz-neutral flex items-center justify-between px-4 lg:px-6">
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="icon"
								className="lg:hidden"
								onClick={() => setSidebarOpen(true)}
							>
								<Menu className="h-5 w-5" />
							</Button>
							<h1 className="font-semibold text-oz-primary">
								{adminLinks.find((link) => isActive(link.href))?.label || "Admin"}
							</h1>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">{user?.name || 'User'}</span>
							<div className="w-8 h-8 rounded-full bg-oz-primary flex items-center justify-center text-white font-semibold text-sm">
								{(user?.name?.charAt(0) || 'U').toUpperCase()}
							</div>
						</div>
					</header>

					{/* Page Content */}
					<main className="p-4 lg:p-6">
						<Outlet />
					</main>
				</div>
			</div>
    </div>
  );
}
