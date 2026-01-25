// OG GAINZ - User Dashboard Overview
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Package, 
  Calendar, 
  Wallet, 
  TrendingUp, 
  ArrowRight,
  MessageCircle,
  Pause,
  Receipt,
  HelpCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/context/UserContext";
import { dashboardService } from "@/services/dashboardService";
import { formatCurrency } from "@/utils/formatCurrency";
import { SUPPORT_WHATSAPP_NUMBER } from "@/config/env";
import { useToast } from "@/hooks/use-toast";
import type { MyDelivery } from "@/services/deliveriesService";

const Dashboard = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboardService.getDashboardData>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (args?: { silent?: boolean }) => {
    if (!user?.id) return;
    if (!args?.silent) setLoading(true);
    setLoadError(null);
    const ac = new AbortController();

    try {
      const next = await dashboardService.getDashboardData(user.id, { signal: ac.signal });
      setData(next);
      if (next.warnings?.length) {
        toast({
          title: 'Some dashboard data is unavailable',
          description: next.warnings.join(' · '),
        });
      }
    } catch (e) {
      const msg = String((e as { message?: unknown })?.message || e || 'Failed to load dashboard');
      setLoadError(msg);
      toast({ title: 'Failed to load dashboard', description: msg, variant: 'destructive' });
    } finally {
      if (!args?.silent) setLoading(false);
    }

    return () => ac.abort();
  }, [toast, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load, user?.id]);

  useEffect(() => {
    const onRefresh = () => {
      load({ silent: true });
    };
    window.addEventListener('og:dashboard-refresh', onRefresh);
    return () => window.removeEventListener('og:dashboard-refresh', onRefresh);
  }, [load]);

  const pausedSubscription = useMemo(() => (data?.subscriptions || []).find((s) => s.status === 'paused') || null, [data?.subscriptions]);
  const activeSubscriptions = useMemo(() => (data?.subscriptions || []).filter((s) => s.status === 'active'), [data?.subscriptions]);

  const getDeliveryStatusBadge = (status: MyDelivery['status']) => {
    const map: Record<MyDelivery['status'], { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-700 border-gray-200' },
      COOKING: { label: 'Cooking', className: 'bg-amber-100 text-amber-800 border-amber-200' },
      PACKED: { label: 'Packed', className: 'bg-violet-100 text-violet-800 border-violet-200' },
      OUT_FOR_DELIVERY: { label: 'Out for delivery', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      DELIVERED: { label: 'Delivered', className: 'bg-green-100 text-green-800 border-green-200' },
      SKIPPED: { label: 'Skipped', className: 'bg-red-100 text-red-800 border-red-200' },
    };
    return map[status] || map.PENDING;
  };

  const handleWhatsAppSupport = () => {
    const message = encodeURIComponent(
      `Hi OG Gainz team, I need help with my subscription.\n\nName: ${data?.profile?.name || user?.name || 'User'}`
    );
    const n = String(SUPPORT_WHATSAPP_NUMBER || '').trim();
    const phone = n || '919876543210';
    window.open(`https://wa.me/${encodeURIComponent(phone)}?text=${message}`, '_blank');
  };

  const skeleton = (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 bg-oz-neutral/50 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-oz-neutral/50 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-48 bg-oz-neutral/50 rounded-lg" />
        <div className="h-48 bg-oz-neutral/50 rounded-lg" />
      </div>
    </div>
  );

  if (loading && !data) return skeleton;

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <p className="font-medium">Unable to load dashboard</p>
          <p className="text-sm text-muted-foreground">{loadError || 'Please try again.'}</p>
          <Button onClick={() => load()} className="bg-oz-secondary hover:bg-oz-secondary/90">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-oz-primary to-oz-secondary rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {data.profile?.name?.split(" ")[0] || user?.name?.split(" ")[0] || "Champion"}! 💪
        </h1>
        <p className="text-white/80">
          {data.hasActiveSubscription
            ? `You have ${data.mealsRemaining} meals remaining across your plan(s).`
            : data.pausedSubscriptionsCount > 0
            ? "Your subscription is paused. Resume anytime to continue your fitness journey!"
            : "Start your fitness journey with our meal packs today!"}
        </p>
        {!data.hasActiveSubscription && data.pausedSubscriptionsCount === 0 && (
          <Link to={data.ctaHref}>
            <Button className="mt-4 bg-white text-oz-primary hover:bg-white/90">
              {data.ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Paused Subscription Alert */}
      {data.pausedSubscriptionsCount > 0 && pausedSubscription && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <Pause className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 mb-1">Subscription Paused</h3>
                <p className="text-sm text-yellow-700">
                  Your subscription is currently paused.
                </p>
                <Link to="/dashboard/subscriptions">
                  <Button size="sm" className="mt-3 bg-yellow-600 hover:bg-yellow-700">
                    Resume Subscription
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Deliveries Preview */}
      <Card className="border-oz-accent">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-oz-accent" />
            Upcoming Deliveries
          </CardTitle>
          <Link to="/dashboard/deliveries">
            <Button variant="ghost" size="sm" className="text-oz-secondary">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-12 bg-oz-neutral/50 rounded-lg" />
              <div className="h-12 bg-oz-neutral/50 rounded-lg" />
            </div>
          ) : data.upcomingDeliveries.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No deliveries scheduled in the next 3 days.
            </div>
          ) : (
            data.upcomingDeliveries.map((d) => {
              const badge = getDeliveryStatusBadge(d.status);
              const dateLabel = new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={String(d.id || d._id || `${d.date}-${d.time}`)} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-oz-primary truncate">{dateLabel}</p>
                    <p className="text-sm text-muted-foreground">{d.time}</p>
                  </div>
                  <Badge className={badge.className} variant="outline">
                    {badge.label}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-3xl font-bold text-oz-primary">
                  {loading ? '—' : data.activeSubscriptionsCount}
                </p>
                {data.pausedSubscriptionsCount > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    +{data.pausedSubscriptionsCount} paused
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-oz-secondary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-oz-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Meals Remaining</p>
                <p className="text-3xl font-bold text-oz-primary">{loading ? '—' : data.mealsRemaining}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-oz-accent/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-oz-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-3xl font-bold text-oz-primary">{loading ? '—' : formatCurrency(data.walletBalance)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Snapshot */}
      {activeSubscriptions.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Subscriptions</CardTitle>
            <Link to="/dashboard/subscriptions">
              <Button variant="ghost" size="sm" className="text-oz-secondary">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.subscriptions.slice(0, 2).map((sub) => (
              <div key={sub.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-oz-primary truncate">{sub.title}</h3>
                    <p className="text-sm text-muted-foreground">{sub.planLabel}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={sub.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}
                  >
                    {sub.status === 'active' ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {sub.delivered}/{sub.total} meals
                    </span>
                  </div>
                  <Progress value={sub.progress} className="h-2" />
                </div>
                <div className="mt-3 flex justify-end">
                  <Link to={sub.ctaHref}>
                    <Button variant="outline" size="sm" className="text-muted-foreground">
                      View details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No active subscriptions</h3>
            <p className="text-sm text-muted-foreground">Browse meal packs to get started.</p>
            <div className="mt-4">
              <Link to="/meal-packs">
                <Button className="bg-oz-secondary hover:bg-oz-secondary/90">Explore Meal Packs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/dashboard/subscriptions">
          <Card className="hover:border-oz-secondary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Package className="h-8 w-8 mx-auto text-oz-secondary mb-2" />
              <p className="font-medium text-sm">Manage Subscriptions</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/dashboard/wallet">
          <Card className="hover:border-oz-secondary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Wallet className="h-8 w-8 mx-auto text-oz-secondary mb-2" />
              <p className="font-medium text-sm">Wallet & Credits</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/dashboard/orders">
          <Card className="hover:border-oz-secondary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Receipt className="h-8 w-8 mx-auto text-oz-secondary mb-2" />
              <p className="font-medium text-sm">Payment History</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/dashboard/support">
          <Card className="hover:border-oz-secondary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <HelpCircle className="h-8 w-8 mx-auto text-oz-secondary mb-2" />
              <p className="font-medium text-sm">Help & Support</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* WhatsApp Support CTA */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-green-800">Need help with your subscription?</p>
                <p className="text-sm text-green-600">Our support team responds within 5 minutes on WhatsApp</p>
              </div>
            </div>
            <Button 
              onClick={handleWhatsAppSupport}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Chat with Us
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inline refresh affordance (non-blocking) */}
      {loadError && (
        <Card className="border-dashed">
          <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">Some sections may be outdated. {loadError}</p>
            <Button variant="outline" onClick={() => load()}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
