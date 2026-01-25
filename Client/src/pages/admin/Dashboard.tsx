import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  Users,
  CalendarDays,
  MessageSquare,
  TrendingUp,
  IndianRupee,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { adminDashboardService } from '@/services';

type AdminDashboardResponse = Awaited<ReturnType<typeof adminDashboardService.getDashboardData>>;

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  color: 'primary' | 'secondary' | 'accent' | 'muted';
  badgeText?: string;
}

const useCountUp = (value: number, durationMs = 650) => {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    if (!Number.isFinite(target)) {
      setAnimated(0);
      return;
    }

    const start = performance.now();
    const from = animated;
    const delta = target - from;
    let raf = 0;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(Math.round(from + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return animated;
};

const RevenueRow = ({ label, value, formatter }: { label: string; value: number; formatter: Intl.NumberFormat }) => {
  const animated = useCountUp(value);
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold flex items-center tabular-nums">
        <IndianRupee className="w-4 h-4" />
        {formatter.format(animated)}
      </span>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, trend, trendUp, color, badgeText }: StatCardProps) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    accent: 'bg-accent/10 text-accent',
    muted: 'bg-muted text-muted-foreground',
  };

	const animatedValue = useCountUp(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
				<div className="flex items-center gap-2 mb-1">
					<p className="text-sm text-muted-foreground">{title}</p>
					{badgeText ? (
						<Badge variant="secondary" className="h-5 px-2 text-[11px]">
							{badgeText}
						</Badge>
					) : null}
				</div>
				<p className="text-2xl font-bold tabular-nums">{animatedValue}</p>
              {trend && (
                <p className={`text-xs mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {trendUp ? '↑' : '↓'} {trend}
                </p>
              )}
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const inr = useMemo(
    () => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }),
    []
  );

  const timeAgo = (iso: string) => {
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return '';
    const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hrs ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminDashboardService.getDashboardData();
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const id = window.setInterval(() => {
      fetchDashboard();
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const s = data?.stats;
    const g = data?.growth;
    return [
      {
        title: 'Total Orders',
        value: Number(s?.totalOrders || 0),
        icon: Package,
        trend: `${g?.ordersWeeklyPercent ?? 0}% this week`,
        trendUp: Number(g?.ordersWeeklyPercent || 0) >= 0,
        color: 'primary' as const,
      },
      {
        title: 'Active Subscriptions',
        value: Number(s?.activeSubscriptions || 0),
        icon: CalendarDays,
        trend: `${g?.subscriptionsMonthlyPercent ?? 0}% this month`,
        trendUp: Number(g?.subscriptionsMonthlyPercent || 0) >= 0,
        color: 'secondary' as const,
      },
      {
        title: 'Total Users',
        value: Number(s?.totalUsers || 0),
        icon: Users,
        trend: `+${Number(g?.newUsersToday || 0)} today`,
        trendUp: true,
        color: 'accent' as const,
      },
      {
        title: 'Pending Consultations',
        value: Number(s?.pendingConsultations || 0),
        icon: MessageSquare,
        color: 'muted' as const,
        badgeText: Number(s?.pendingConsultations || 0) > 0 ? 'NEW' : undefined,
      },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {loading
        ? [0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))
        : stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="hover:translate-y-[-1px] transition-transform"
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
      </div>

      {error ? (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">{error}</div>
            <Button variant="outline" onClick={fetchDashboard}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Revenue Overview</CardTitle>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
					{loading ? (
						<div className="space-y-4">
							{[0, 1, 2].map((i) => (
								<div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-5 w-28" />
								</div>
							))}
						</div>
					) : (
						<div className="space-y-4">
							{(
								[
									{ label: 'Today', value: Number(data?.revenue?.today || 0) },
									{ label: 'This Week', value: Number(data?.revenue?.thisWeek || 0) },
									{ label: 'This Month', value: Number(data?.revenue?.thisMonth || 0) },
								] as const
              ).map((row) => (
                <RevenueRow key={row.label} label={row.label} value={row.value} formatter={inr} />
              ))}
						</div>
					)}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Consultation Leads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Consultations</CardTitle>
              <Link to="/admin/consultations">
                <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (data?.recentConsultations?.length || 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No consultation requests yet</p>
                </div>
              ) : (
                <div className="space-y-3">
            {(data?.recentConsultations || []).map((c: AdminDashboardResponse['recentConsultations'][number]) => {
              const isUnread = !c.isRead;
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => navigate(`/admin/consultations/${c._id}`)}
                  className={
                    'group w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ' +
                    (isUnread
                      ? 'bg-accent/10 border-accent/30 hover:bg-accent/15'
                      : 'bg-muted/50 border-transparent hover:bg-muted')
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className={(isUnread ? 'font-semibold' : 'font-medium') + ' truncate'}>{c.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.whatsappNumber}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={c.isRead ? 'secondary' : 'destructive'}>{c.isRead ? 'Read' : 'Unread'}</Badge>
                  </div>
                </button>
              );
            })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to="/admin/orders">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <Package className="w-5 h-5" />
                  <span className="text-xs">Manage Orders</span>
                </Button>
              </Link>
              <Link to="/admin/subscriptions">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <CalendarDays className="w-5 h-5" />
                  <span className="text-xs">Subscriptions</span>
                </Button>
              </Link>
              <Link to="/admin/consultations">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 relative">
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-xs">Consultations</span>
						{Number(data?.stats?.pendingConsultations || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
							{Number(data?.stats?.pendingConsultations || 0)}
                    </span>
                  )}
                </Button>
              </Link>
              <Link to="/admin/users">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <Users className="w-5 h-5" />
                  <span className="text-xs">Manage Users</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
