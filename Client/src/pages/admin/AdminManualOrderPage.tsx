import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Phone, RefreshCw, Send, CheckCircle2, XCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AdminFormLayout, ADMIN_FORM_CONTAINER, ADMIN_FORM_GRID, FormField } from '@/components/admin';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/env';
import { mealsCatalogService } from '@/services/mealsCatalogService';
import { addonsCatalogService } from '@/services/addonsCatalogService';
import { adminSettingsService } from '@/services/adminSettingsService';
import { adminManualOrdersService, type ManualOrder } from '@/services/adminManualOrdersService';
import type { Meal, Addon } from '@/types/catalog';
import { formatCurrency } from '@/utils/formatCurrency';

const DRAFT_STORAGE_KEY = 'oz-admin-manual-order-draft';

const todayISO = () => new Date().toISOString().slice(0, 10);

const safeNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getMealUnitPrice = (meal: Meal, plan: 'trial' | 'weekly' | 'monthly') => {
  const pricing = meal.pricing?.[plan];
  if (pricing && typeof pricing.price === 'number' && pricing.price > 0) return pricing.price;

  const withProtein = meal.proteinPricing?.withProtein?.[plan];
  if (withProtein && typeof withProtein.price === 'number' && withProtein.price > 0) return withProtein.price;

  const withoutProtein = meal.proteinPricing?.withoutProtein?.[plan];
  if (withoutProtein && typeof withoutProtein.price === 'number' && withoutProtein.price > 0) return withoutProtein.price;

  return 0;
};

const getAddonUnitPrice = (addon: Addon, plan: 'trial' | 'weekly' | 'monthly') => {
  if (plan === 'trial') return addon.pricing?.single ?? addon.price ?? 0;
  if (plan === 'weekly') return addon.pricing?.weekly ?? 0;
  if (plan === 'monthly') return addon.pricing?.monthly ?? 0;
  return 0;
};

const resolveSubscriptionDays = (subscriptionType: 'trial' | 'weekly' | 'monthly', trialDays: string) => {
  if (subscriptionType === 'weekly') return 7;
  if (subscriptionType === 'monthly') return 30;
  const trial = Number(trialDays);
  return [3, 5, 7].includes(trial) ? trial : 3;
};

const resolveBillLink = (path: string) => {
  if (!path) return '';
  if (/^https?:/i.test(path)) return path;
  const base = API_BASE_URL || window.location.origin;
  const trimmedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (trimmedBase.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${trimmedBase}${normalizedPath.slice(4)}`;
  }
  return `${trimmedBase}${normalizedPath}`;
};

const buildBillText = (manualOrder: ManualOrder) => {
  const headerLines = [
    'OG GAINZ MANUAL ORDER',
    `Order ID: ${manualOrder.manual_order_id || manualOrder._id || ''}`,
    `Customer: ${manualOrder.customer_name || ''}`,
    `Phone: ${manualOrder.phone_number || ''}`,
    `WhatsApp: ${manualOrder.whatsapp_number || ''}`,
    `Distance: ${Number(manualOrder.distance_km || 0)} km`,
    `Deliveries/day: ${Number(manualOrder.deliveries_per_day || 0)}`,
    `Subscription: ${String(manualOrder.subscription_type || '').toUpperCase()} (${Number(manualOrder.subscription_days || 0)} days)`,
  ];

  const mealLines = (manualOrder.meal_items || []).map((item) => {
    const plan = String(item.subscription_type || manualOrder.subscription_type || '').toUpperCase();
    const time = item.delivery_time || manualOrder.delivery_time || '';
    const timeLabel = time ? ` @ ${time}` : '';
    return `Meal: ${item.name} x${Number(item.quantity || 0)} (${plan}${timeLabel}) = INR ${Number(item.line_total || 0)}`;
  });

  const addonLines = (manualOrder.addon_items || []).map((item) => {
    const plan = String(item.subscription_type || manualOrder.subscription_type || '').toUpperCase();
    const time = item.delivery_time || manualOrder.delivery_time || '';
    const timeLabel = time ? ` @ ${time}` : '';
    return `Add-on: ${item.name} x${Number(item.quantity || 0)} (${plan}${timeLabel}) = INR ${Number(item.line_total || 0)}`;
  });

  const totals = [
    `Meal cost: INR ${Number(manualOrder.meal_cost || 0)}`,
    `Add-on cost: INR ${Number(manualOrder.addon_cost || 0)}`,
    `Total delivery fees: INR ${Number(manualOrder.delivery_cost_total || 0)}`,
    `Total fees: INR ${Number(manualOrder.grand_total || 0)}`,
  ];

  const lines = [...headerLines, 'Items:', ...mealLines, ...addonLines, ...totals];
  return lines.join('\n');
};

type DraftMealEntry = {
  quantity: number;
  subscriptionType: 'trial' | 'weekly' | 'monthly';
  deliveryTime: string;
  trialDays: string;
  startDate: string;
};

type DraftAddonEntry = {
  quantity: number;
  subscriptionType: 'trial' | 'weekly' | 'monthly';
  deliveryTime: string;
  trialDays: string;
  startDate: string;
};

type DraftState = {
  manualOrderId?: string;
  customerName: string;
  phoneNumber: string;
  whatsappNumber: string;
  address: string;
  notes: string;
  distanceKm: string;
  deliveryTime: string;
  deliveriesPerDay: string;
  subscriptionType: 'trial' | 'weekly' | 'monthly';
  trialDays: string;
  startDate: string;
  meals: Record<string, DraftMealEntry>;
  addons: Record<string, DraftAddonEntry | number>;
};

const emptyDraft = (): DraftState => ({
  manualOrderId: undefined,
  customerName: '',
  phoneNumber: '',
  whatsappNumber: '',
  address: '',
  notes: '',
  distanceKm: '',
  deliveryTime: '',
  deliveriesPerDay: '1',
  subscriptionType: 'weekly',
  trialDays: '3',
  startDate: todayISO(),
  meals: {},
  addons: {},
});

export default function AdminManualOrderPage() {
  const { toast } = useToast();
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [manualOrder, setManualOrder] = useState<ManualOrder | null>(null);
  const [billUrl, setBillUrl] = useState<string | null>(null);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [costPerKm, setCostPerKm] = useState(0);
  const [freeDeliveryRadius, setFreeDeliveryRadius] = useState(0);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingManualOrder, setLoadingManualOrder] = useState(false);

  const [saving, setSaving] = useState(false);
  const [billing, setBilling] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const hydratedRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DraftState;
        setDraft({ ...emptyDraft(), ...parsed });
      } catch {
        setDraft(emptyDraft());
      }
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingCatalog(true);

    Promise.all([
      mealsCatalogService.listMeals({ page: 1, limit: 200 }, { signal: controller.signal }),
      addonsCatalogService.listAddons({ page: 1, limit: 300 }, { signal: controller.signal }),
      adminSettingsService.getSettings({ signal: controller.signal }),
    ])
      .then(([mealsRes, addonsRes, settings]) => {
        setMeals(mealsRes.data || []);
        setAddons(addonsRes.data || []);
        setCostPerKm(settings.extraChargePerKm || 0);
        setFreeDeliveryRadius(settings.freeDeliveryRadius || 0);
      })
      .catch(() => {
        toast({ title: 'Unable to load catalogs', description: 'Refresh the page to try again.', variant: 'destructive' });
      })
      .finally(() => setLoadingCatalog(false));

    return () => controller.abort();
  }, [toast]);

  useEffect(() => {
    if (!draft.manualOrderId) return;

    setLoadingManualOrder(true);
    adminManualOrdersService
      .get(draft.manualOrderId)
      .then((data) => {
        setManualOrder(data);
        if (data.bill_generated_at) {
          setBillUrl(`/api/manual-orders/${data._id}/bill`);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingManualOrder(false));
  }, [draft.manualOrderId]);

  const defaultSubscriptionDays = useMemo(() => {
    return resolveSubscriptionDays(draft.subscriptionType, draft.trialDays);
  }, [draft.subscriptionType, draft.trialDays]);

  const getMealDraft = (mealId: string): DraftMealEntry => {
    return (
      draft.meals[mealId] || {
        quantity: 0,
        subscriptionType: draft.subscriptionType,
        deliveryTime: draft.deliveryTime,
        trialDays: draft.trialDays,
        startDate: draft.startDate,
      }
    );
  };

  const getAddonDraft = (addonId: string): DraftAddonEntry => {
    const stored = draft.addons[addonId];
    if (typeof stored === 'number') {
      return {
        quantity: stored,
        subscriptionType: draft.subscriptionType,
        deliveryTime: draft.deliveryTime,
        trialDays: draft.trialDays,
        startDate: draft.startDate,
      };
    }
    return (
      stored || {
        quantity: 0,
        subscriptionType: draft.subscriptionType,
        deliveryTime: draft.deliveryTime,
        trialDays: draft.trialDays,
        startDate: draft.startDate,
      }
    );
  };

  const mealSelections = useMemo(() => {
    return Object.entries(draft.meals)
      .filter(([, data]) => (data?.quantity || 0) > 0)
      .map(([mealId, data]) => ({
        mealId,
        quantity: data.quantity,
        subscriptionType: data.subscriptionType,
        deliveryTime: data.deliveryTime,
        trialDays: data.trialDays,
        startDate: data.startDate,
      }));
  }, [draft.meals]);

  const addonSelections = useMemo(() => {
    return Object.entries(draft.addons)
      .map(([addonId, raw]) => {
        if (typeof raw === 'number') {
          return {
            addonId,
            quantity: raw,
            subscriptionType: draft.subscriptionType,
            deliveryTime: draft.deliveryTime,
            trialDays: draft.trialDays,
            startDate: draft.startDate,
          };
        }
        return {
          addonId,
          quantity: raw.quantity,
          subscriptionType: raw.subscriptionType,
          deliveryTime: raw.deliveryTime,
          trialDays: raw.trialDays,
          startDate: raw.startDate,
        };
      })
      .filter((item) => item.quantity > 0);
  }, [draft.addons, draft.deliveryTime, draft.startDate, draft.subscriptionType, draft.trialDays]);

  const mealCost = useMemo(() => {
    return mealSelections.reduce((sum, sel) => {
      const meal = meals.find((m) => m.id === sel.mealId);
      if (!meal) return sum;
      const unitPrice = getMealUnitPrice(meal, sel.subscriptionType);
      return sum + unitPrice * sel.quantity;
    }, 0);
  }, [mealSelections, meals]);

  const addonCost = useMemo(() => {
    return addonSelections.reduce((sum, sel) => {
      const addon = addons.find((a) => a.id === sel.addonId);
      if (!addon) return sum;
      const unitPrice = getAddonUnitPrice(addon, sel.subscriptionType);
      return sum + unitPrice * sel.quantity;
    }, 0);
  }, [addonSelections, addons]);

  const distanceKm = safeNumber(draft.distanceKm);
  const deliveriesPerDay = Math.max(1, Number(draft.deliveriesPerDay) || 1);
  const chargeableDistance = Math.max(0, distanceKm - freeDeliveryRadius);
  const singleDeliveryCost = chargeableDistance * costPerKm;

  const totalDeliveries = useMemo(() => {
    if (mealSelections.length) {
      return (
        mealSelections.reduce((sum, sel) => sum + resolveSubscriptionDays(sel.subscriptionType, sel.trialDays), 0) *
        deliveriesPerDay
      );
    }
    if (addonSelections.length) {
      return (
        addonSelections.reduce((sum, sel) => sum + resolveSubscriptionDays(sel.subscriptionType, sel.trialDays), 0) *
        deliveriesPerDay
      );
    }
    return 0;
  }, [mealSelections, addonSelections, deliveriesPerDay]);

  const dailyDeliveryCost = singleDeliveryCost * deliveriesPerDay;
  const totalDeliveryCost = singleDeliveryCost * totalDeliveries;
  const grandTotal = mealCost + addonCost + totalDeliveryCost;

  const payload = useMemo(
    () => ({
      customerName: draft.customerName.trim(),
      phoneNumber: draft.phoneNumber.trim(),
      whatsappNumber: draft.whatsappNumber.trim(),
      address: draft.address.trim(),
      notes: draft.notes.trim(),
      distanceKm,
      deliveryTime: draft.deliveryTime,
      deliveriesPerDay,
      subscriptionType: draft.subscriptionType,
      trialDays: draft.subscriptionType === 'trial' ? Number(draft.trialDays) : undefined,
      subscriptionDays: defaultSubscriptionDays,
      startDate: draft.startDate,
      mealItems: mealSelections,
      addonItems: addonSelections,
    }),
    [draft, distanceKm, deliveriesPerDay, defaultSubscriptionDays, mealSelections, addonSelections]
  );

  const hasMealMissingTime = mealSelections.some((sel) => !sel.deliveryTime);
  const hasMealMissingStartDate = mealSelections.some((sel) => !sel.startDate);
  const hasAddonMissingTime = addonSelections.some((sel) => !sel.deliveryTime);
  const hasAddonMissingStartDate = addonSelections.some((sel) => !sel.startDate);
  const isReadyToSave =
    payload.customerName &&
    payload.phoneNumber &&
    payload.address &&
    !hasMealMissingTime &&
    !hasMealMissingStartDate &&
    !hasAddonMissingTime &&
    !hasAddonMissingStartDate &&
    (payload.mealItems.length > 0 || payload.addonItems.length > 0);

  const saveDraft = async () => {
    if (!isReadyToSave) {
      toast({ title: 'Complete required fields', description: 'Add customer info, delivery time, and at least one item.' });
      return;
    }

    setSaving(true);
    try {
      const data = draft.manualOrderId
        ? await adminManualOrdersService.update(draft.manualOrderId, payload)
        : await adminManualOrdersService.create(payload);

      setManualOrder(data);
      setDraft((prev) => ({ ...prev, manualOrderId: data._id }));
      toast({ title: draft.manualOrderId ? 'Manual order updated' : 'Manual order created' });
    } catch (err: unknown) {
      toast({ title: 'Save failed', description: String((err as { message?: unknown })?.message || err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const onGenerateBill = async () => {
    if (!draft.manualOrderId) {
      toast({ title: 'Create the manual order first' });
      return;
    }

    setBilling(true);
    try {
      const result = await adminManualOrdersService.generateBill(draft.manualOrderId);
      setBillUrl(result.billUrl);
      toast({ title: 'Bill generated' });
    } catch (err: unknown) {
      toast({ title: 'Bill generation failed', description: String((err as { message?: unknown })?.message || err), variant: 'destructive' });
    } finally {
      setBilling(false);
    }
  };

  const onShareBill = () => {
    if (!billUrl) {
      toast({ title: 'Generate a bill first' });
      return;
    }

    if (!manualOrder) {
      toast({ title: 'Save the manual order first' });
      return;
    }

    const phone = payload.whatsappNumber || payload.phoneNumber;
    const message = buildBillText(manualOrder);

    const url = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const onViewBill = async () => {
    if (!draft.manualOrderId) {
      toast({ title: 'Generate a bill first' });
      return;
    }

    try {
      const blob = await adminManualOrdersService.fetchBillBlob(draft.manualOrderId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: unknown) {
      toast({ title: 'Unable to open bill', description: String((err as { message?: unknown })?.message || err), variant: 'destructive' });
    }
  };

  const onMarkPaid = async () => {
    if (!draft.manualOrderId) {
      toast({ title: 'Create the manual order first' });
      return;
    }

    setMarkingPaid(true);
    try {
      const data = await adminManualOrdersService.markPaid(draft.manualOrderId);
      setManualOrder(data);
      toast({ title: 'Marked as paid', description: 'Order moved to kitchen schedule.' });
    } catch (err: unknown) {
      toast({ title: 'Failed to mark paid', description: String((err as { message?: unknown })?.message || err), variant: 'destructive' });
    } finally {
      setMarkingPaid(false);
    }
  };

  const onCancel = async () => {
    if (!draft.manualOrderId) return;
    try {
      const data = await adminManualOrdersService.cancel(draft.manualOrderId);
      setManualOrder(data);
      toast({ title: 'Manual order cancelled' });
    } catch (err: unknown) {
      toast({ title: 'Cancel failed', description: String((err as { message?: unknown })?.message || err), variant: 'destructive' });
    }
  };

  const onResetDraft = () => {
    setDraft(emptyDraft());
    setManualOrder(null);
    setBillUrl(null);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const paymentStatus = manualOrder?.payment_status || 'PENDING';
  const isLocked = paymentStatus === 'PAID' || paymentStatus === 'CANCELLED';

  return (
    <div className="space-y-6">
      {loadingManualOrder ? (
        <Alert>
          <AlertTitle>Loading manual order...</AlertTitle>
          <AlertDescription>Please wait while we sync the latest status.</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={saveDraft} disabled={saving || loadingCatalog || isLocked} className="h-11 rounded-xl">
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </span>
          ) : (
            'Save Manual Order'
          )}
        </Button>
        <Button variant="outline" onClick={onGenerateBill} disabled={billing || !draft.manualOrderId} className="h-11 rounded-xl">
          {billing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Bill'}
        </Button>
        <Button variant="outline" onClick={onShareBill} disabled={!billUrl} className="h-11 rounded-xl">
          <Send className="h-4 w-4 mr-2" /> Share Bill
        </Button>
        <Button variant="default" onClick={onMarkPaid} disabled={markingPaid || !draft.manualOrderId || isLocked} className="h-11 rounded-xl">
          {markingPaid ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark as Paid'}
        </Button>
        <Button variant="destructive" onClick={onCancel} disabled={!draft.manualOrderId || isLocked} className="h-11 rounded-xl">
          <XCircle className="h-4 w-4 mr-2" /> Cancel
        </Button>
        <Button variant="ghost" onClick={onResetDraft} className="h-11 rounded-xl">
          <RefreshCw className="h-4 w-4 mr-2" /> Reset Draft
        </Button>
      </div>

      {manualOrder ? (
        <Card className="border-oz-neutral/40">
          <CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">Manual Order:</span>
            <span className="font-mono">{manualOrder.manual_order_id}</span>
            <span className="inline-flex items-center gap-2">
              {paymentStatus === 'PAID' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Phone className="h-4 w-4 text-amber-500" />}
              {paymentStatus}
            </span>
            {manualOrder.order_status ? <span className="text-muted-foreground">{manualOrder.order_status}</span> : null}
            {billUrl ? (
              <button type="button" className="text-oz-primary underline" onClick={onViewBill}>
                View bill
              </button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminFormLayout className={ADMIN_FORM_CONTAINER}>
            <div className={ADMIN_FORM_GRID}>
              <FormField label="Customer Name" required>
                <Input
                  value={draft.customerName}
                  onChange={(event) => setDraft((prev) => ({ ...prev, customerName: event.target.value }))}
                  disabled={isLocked}
                />
              </FormField>
              <FormField label="Phone Number" required>
                <Input
                  value={draft.phoneNumber}
                  onChange={(event) => setDraft((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                  disabled={isLocked}
                />
              </FormField>
              <FormField label="WhatsApp Number">
                <Input
                  value={draft.whatsappNumber}
                  onChange={(event) => setDraft((prev) => ({ ...prev, whatsappNumber: event.target.value }))}
                  disabled={isLocked}
                />
              </FormField>
            </div>
            <FormField label="Address" required>
              <Textarea
                value={draft.address}
                onChange={(event) => setDraft((prev) => ({ ...prev, address: event.target.value }))}
                rows={3}
                disabled={isLocked}
              />
            </FormField>
            <FormField label="Notes">
              <Textarea
                value={draft.notes}
                onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                rows={2}
                disabled={isLocked}
              />
            </FormField>
          </AdminFormLayout>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Delivery Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminFormLayout className={ADMIN_FORM_CONTAINER}>
            <div className={ADMIN_FORM_GRID}>
              <FormField label="Distance (km)" required>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={draft.distanceKm}
                  onChange={(event) => setDraft((prev) => ({ ...prev, distanceKm: event.target.value }))}
                  disabled={isLocked}
                />
              </FormField>
              <FormField label="Delivery Cost Per Km">
                <Input value={costPerKm} disabled />
              </FormField>
            </div>
          </AdminFormLayout>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meal Packs</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCatalog ? (
            <div className="text-sm text-muted-foreground">Loading meals...</div>
          ) : (
            <div className="space-y-3">
              {meals.map((meal) => {
                const mealDraft = getMealDraft(meal.id);
                const selectedQty = mealDraft.quantity || 0;
                const unitPrice = getMealUnitPrice(meal, mealDraft.subscriptionType);
                const resolvedDays = resolveSubscriptionDays(mealDraft.subscriptionType, mealDraft.trialDays);
                return (
                  <div key={meal.id} className="flex flex-wrap items-center gap-3 border-b border-oz-neutral/30 pb-3">
                    <Checkbox
                      checked={selectedQty > 0}
                      onCheckedChange={(checked) => {
                        setDraft((prev) => ({
                          ...prev,
                          meals: {
                            ...prev.meals,
                            [meal.id]: checked
                              ? {
                                  quantity: Math.max(1, selectedQty || 1),
                                  subscriptionType: mealDraft.subscriptionType,
                                  deliveryTime: mealDraft.deliveryTime,
                                  trialDays: mealDraft.trialDays,
                                  startDate: mealDraft.startDate,
                                }
                              : {
                                  quantity: 0,
                                  subscriptionType: mealDraft.subscriptionType,
                                  deliveryTime: mealDraft.deliveryTime,
                                  trialDays: mealDraft.trialDays,
                                    startDate: mealDraft.startDate,
                                },
                          },
                        }));
                      }}
                      disabled={isLocked}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{meal.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(unitPrice)} / {mealDraft.subscriptionType} · {resolvedDays} days
                      </div>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
                      value={selectedQty || ''}
                      onChange={(event) => {
                        const next = Math.max(0, Number(event.target.value) || 0);
                        setDraft((prev) => ({
                          ...prev,
                          meals: { ...prev.meals, [meal.id]: { ...mealDraft, quantity: next } },
                        }));
                      }}
                      disabled={isLocked}
                    />
                    <Select
                      value={mealDraft.subscriptionType}
                      onValueChange={(value) => {
                        setDraft((prev) => ({
                          ...prev,
                          meals: {
                            ...prev.meals,
                            [meal.id]: { ...mealDraft, subscriptionType: value as DraftState['subscriptionType'] },
                          },
                        }));
                      }}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      className="w-32"
                      value={mealDraft.deliveryTime}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          meals: {
                            ...prev.meals,
                            [meal.id]: { ...mealDraft, deliveryTime: value },
                          },
                        }));
                      }}
                      disabled={isLocked}
                    />
                    <Input
                      type="date"
                      className="w-40"
                      value={mealDraft.startDate}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          meals: {
                            ...prev.meals,
                            [meal.id]: { ...mealDraft, startDate: value },
                          },
                        }));
                      }}
                      disabled={isLocked}
                    />
                    {mealDraft.subscriptionType === 'trial' ? (
                      <Select
                        value={mealDraft.trialDays}
                        onValueChange={(value) => {
                          setDraft((prev) => ({
                            ...prev,
                            meals: {
                              ...prev.meals,
                              [meal.id]: { ...mealDraft, trialDays: value },
                            },
                          }));
                        }}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Days" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3d</SelectItem>
                          <SelectItem value="5">5d</SelectItem>
                          <SelectItem value="7">7d</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add-ons</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCatalog ? (
            <div className="text-sm text-muted-foreground">Loading add-ons...</div>
          ) : (
            <div className="space-y-3">
              {addons.map((addon) => {
                const addonDraft = getAddonDraft(addon.id);
                const selectedQty = addonDraft.quantity || 0;
                const unitPrice = getAddonUnitPrice(addon, addonDraft.subscriptionType);
                const resolvedDays = resolveSubscriptionDays(addonDraft.subscriptionType, addonDraft.trialDays);
                return (
                  <div key={addon.id} className="flex flex-wrap items-center gap-3 border-b border-oz-neutral/30 pb-3">
                    <Checkbox
                      checked={selectedQty > 0}
                      onCheckedChange={(checked) => {
                        setDraft((prev) => ({
                          ...prev,
                          addons: {
                            ...prev.addons,
                            [addon.id]: checked
                              ? {
                                  quantity: Math.max(1, selectedQty || 1),
                                  subscriptionType: addonDraft.subscriptionType,
                                  deliveryTime: addonDraft.deliveryTime,
                                  trialDays: addonDraft.trialDays,
                                  startDate: addonDraft.startDate,
                                }
                              : {
                                  quantity: 0,
                                  subscriptionType: addonDraft.subscriptionType,
                                  deliveryTime: addonDraft.deliveryTime,
                                  trialDays: addonDraft.trialDays,
                                  startDate: addonDraft.startDate,
                                },
                          },
                        }));
                      }}
                      disabled={isLocked}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{addon.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(unitPrice)} / {addonDraft.subscriptionType} · {resolvedDays} days
                      </div>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
                      value={selectedQty || ''}
                      onChange={(event) => {
                        const next = Math.max(0, Number(event.target.value) || 0);
                        setDraft((prev) => ({
                          ...prev,
                          addons: { ...prev.addons, [addon.id]: { ...addonDraft, quantity: next } },
                        }));
                      }}
                      disabled={isLocked}
                    />
                    <Select
                      value={addonDraft.subscriptionType}
                      onValueChange={(value) => {
                        setDraft((prev) => ({
                          ...prev,
                          addons: {
                            ...prev.addons,
                            [addon.id]: { ...addonDraft, subscriptionType: value as DraftState['subscriptionType'] },
                          },
                        }));
                      }}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      className="w-32"
                      value={addonDraft.deliveryTime}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          addons: { ...prev.addons, [addon.id]: { ...addonDraft, deliveryTime: value } },
                        }));
                      }}
                      disabled={isLocked}
                    />
                    <Input
                      type="date"
                      className="w-40"
                      value={addonDraft.startDate}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          addons: { ...prev.addons, [addon.id]: { ...addonDraft, startDate: value } },
                        }));
                      }}
                      disabled={isLocked}
                    />
                    {addonDraft.subscriptionType === 'trial' ? (
                      <Select
                        value={addonDraft.trialDays}
                        onValueChange={(value) => {
                          setDraft((prev) => ({
                            ...prev,
                            addons: { ...prev.addons, [addon.id]: { ...addonDraft, trialDays: value } },
                          }));
                        }}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Days" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3d</SelectItem>
                          <SelectItem value="5">5d</SelectItem>
                          <SelectItem value="7">7d</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Meal Cost</span>
            <span className="font-medium">{formatCurrency(mealCost)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Add-on Cost</span>
            <span className="font-medium">{formatCurrency(addonCost)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Single Delivery Cost</span>
            <span className="font-medium">{formatCurrency(singleDeliveryCost)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Daily Delivery Cost</span>
            <span className="font-medium">{formatCurrency(dailyDeliveryCost)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total Delivery Cost</span>
            <span className="font-medium">{formatCurrency(totalDeliveryCost)}</span>
          </div>
          <div className="flex items-center justify-between text-base">
            <span className="font-semibold">Grand Total</span>
            <span className="font-semibold text-oz-accent">{formatCurrency(grandTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {!isReadyToSave ? (
        <Alert variant="destructive">
          <AlertTitle>Missing required information</AlertTitle>
          <AlertDescription>Fill customer details, delivery time, and select at least one item before saving.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
