import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  User,
  Target,
  Briefcase,
  Utensils,
  MessageSquare,
  CheckCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { consultationService } from '@/services';
import type { ConsultationLead } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';

const AdminConsultations = () => {
  const { toast } = useToast();
	const navigate = useNavigate();
	const params = useParams();
	const routeLeadId = useMemo(() => String(params.id || '').trim(), [params.id]);
  const [leads, setLeads] = useState<ConsultationLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'contacted'>('all');
  const [selectedLead, setSelectedLead] = useState<ConsultationLead | null>(null);
  const [markingAsContacted, setMarkingAsContacted] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await consultationService.getLeads();
      setLeads(
        data.sort((a, b) => {
          // Unread first, then newest
          const unreadDiff = Number(a.isContacted) - Number(b.isContacted);
          if (unreadDiff !== 0) return unreadDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
    );

    // Deep-link support: if /admin/consultations/:id is visited, open the dialog.
    if (routeLeadId) {
      const fromList = data.find((l) => l.id === routeLeadId);
      if (fromList) {
        setSelectedLead(fromList);
      } else {
        try {
          const fetched = await consultationService.getLeadById(routeLeadId);
          if (fetched) setSelectedLead(fetched);
        } catch {
          // ignore; list load toast already covers generic failures
        }
      }
    }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load consultations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [routeLeadId, toast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (!routeLeadId) return;
    if (loading) return;
    const existing = leads.find((l) => l.id === routeLeadId);
    if (existing) setSelectedLead(existing);
  }, [routeLeadId, loading, leads]);

  const handleMarkAsContacted = async (leadId: string) => {
    setMarkingAsContacted(leadId);
    try {
      const updated = await consultationService.markAsContacted(leadId);
      if (updated) {
        setLeads((prev) =>
          prev.map((lead) => (lead.id === leadId ? updated : lead))
        );
        if (selectedLead?.id === leadId) {
          setSelectedLead(updated);
        }
        toast({
          title: 'Lead Updated',
          description: 'Lead has been marked as contacted.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update lead. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setMarkingAsContacted(null);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !lead.isContacted) ||
      (statusFilter === 'contacted' && lead.isContacted);
    return matchesSearch && matchesStatus;
  });

  const pendingCount = leads.filter((l) => !l.isContacted).length;
  const contactedCount = leads.filter((l) => l.isContacted).length;

  const getFitnessGoalLabel = (goal: ConsultationLead['fitnessGoal']) => {
    return consultationService.getFitnessGoalDisplay(goal);
  };

  const getWorkRoutineLabel = (routine: ConsultationLead['workRoutine']) => {
    return consultationService.getWorkRoutineDisplay(routine);
  };

  const formatFoodPreference = (pref: string) => {
    const map: Record<string, string> = {
      veg: 'Vegetarian',
      non_veg: 'Non-Vegetarian',
      eggetarian: 'Eggetarian',
    };
    return map[pref] || pref;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Read</p>
                <p className="text-2xl font-bold text-green-600">{contactedCount}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Unread</SelectItem>
                <SelectItem value="contacted">Read</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchLeads} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consultation Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No consultation requests found</p>
              <p className="text-sm">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'New requests will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLeads.map((lead, index) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">{lead.name}</p>
                        <Badge
                          variant={lead.isContacted ? 'secondary' : 'destructive'}
                          className="shrink-0"
                        >
                            {lead.isContacted ? 'Read' : 'Unread'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {getFitnessGoalLabel(lead.fitnessGoal)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLead(lead);
                          navigate(`/admin/consultations/${lead.id}`);
                        }}
                      >
                        View Details
                      </Button>
                      {!lead.isContacted && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsContacted(lead.id)}
                          disabled={markingAsContacted === lead.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {markingAsContacted === lead.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark as Read
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog
        open={!!selectedLead}
        onOpenChange={(open) => {
          if (open) return;
          setSelectedLead(null);
          navigate('/admin/consultations');
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Consultation Details</DialogTitle>
            <DialogDescription>
              Lead submitted on{' '}
              {selectedLead && new Date(selectedLead.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Badge
                  variant={selectedLead.isContacted ? 'secondary' : 'destructive'}
                  className="text-sm"
                >
                  {selectedLead.isContacted ? 'Read' : 'Unread'}
                </Badge>
                {selectedLead.contactedAt && (
                  <span className="text-xs text-muted-foreground">
                    Read: {new Date(selectedLead.contactedAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selectedLead.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">WhatsApp Number</p>
                    <p className="font-medium">{selectedLead.phone}</p>
                  </div>
                  <a
                    href={`https://wa.me/${selectedLead.phone.replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open
                    </Button>
                  </a>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Target className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fitness Goal</p>
                    <p className="font-medium">{getFitnessGoalLabel(selectedLead.fitnessGoal)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Work Routine</p>
                    <p className="font-medium">{getWorkRoutineLabel(selectedLead.workRoutine)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Utensils className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Food Preference</p>
                    <p className="font-medium">{formatFoodPreference(selectedLead.foodPreferences)}</p>
                  </div>
                </div>

                {selectedLead.additionalNotes && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Additional Notes</p>
                      <p className="font-medium">{selectedLead.additionalNotes}</p>
                    </div>
                  </div>
                )}
              </div>

              {!selectedLead.isContacted && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleMarkAsContacted(selectedLead.id)}
                  disabled={markingAsContacted === selectedLead.id}
                >
                  {markingAsContacted === selectedLead.id ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Mark as Read
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminConsultations;
