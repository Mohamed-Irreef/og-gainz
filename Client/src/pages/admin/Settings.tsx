import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminFormLayout, ADMIN_FORM_CONTAINER, ADMIN_FORM_GRID, FormField } from '@/components/admin';
import { useToast } from '@/hooks/use-toast';
import { adminSettingsService, type AdminSettings } from '@/services/adminSettingsService';

const emptySettings: AdminSettings = {
  freeDeliveryRadius: 0,
  extraChargePerKm: 0,
  maxDeliveryRadius: 0,
  signupBonusCredits: 0,
  deliveryCutoffMinutes: 0,
  walletRefundPolicy: '',
};

const toNumber = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function Settings() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    freeDeliveryRadius: '0',
    extraChargePerKm: '0',
    maxDeliveryRadius: '0',
    signupBonusCredits: '0',
    deliveryCutoffMinutes: '0',
    walletRefundPolicy: '',
  });

  const numericPreview = useMemo(
    () => ({
      freeDeliveryRadius: toNumber(form.freeDeliveryRadius),
      extraChargePerKm: toNumber(form.extraChargePerKm),
      maxDeliveryRadius: toNumber(form.maxDeliveryRadius),
      signupBonusCredits: toNumber(form.signupBonusCredits),
      deliveryCutoffMinutes: toNumber(form.deliveryCutoffMinutes),
    }),
    [form]
  );

  const validation = useMemo(() => {
    const errors: Record<string, string> = {};

    if (numericPreview.freeDeliveryRadius < 0) errors.freeDeliveryRadius = 'Must be 0 or higher.';
    if (numericPreview.extraChargePerKm < 0) errors.extraChargePerKm = 'Must be 0 or higher.';
    if (numericPreview.maxDeliveryRadius < 0) errors.maxDeliveryRadius = 'Must be 0 or higher.';
    if (numericPreview.signupBonusCredits < 0) errors.signupBonusCredits = 'Must be 0 or higher.';
    if (numericPreview.deliveryCutoffMinutes < 0) errors.deliveryCutoffMinutes = 'Must be 0 or higher.';
    if (!form.walletRefundPolicy.trim()) errors.walletRefundPolicy = 'Policy text is required.';
    if (form.walletRefundPolicy.trim().length > 0 && form.walletRefundPolicy.trim().length < 10) {
      errors.walletRefundPolicy = 'Enter at least 10 characters.';
    }

    return errors;
  }, [form.walletRefundPolicy, numericPreview]);

  const shouldShowError = (field: string) => Boolean(attemptedSave || touched[field]);
  const getFieldError = (field: keyof typeof validation) => (shouldShowError(field) ? validation[field] : undefined);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    adminSettingsService
      .getSettings({ signal: controller.signal })
      .then((data) => {
        const next = data && Object.keys(data).length > 0 ? data : emptySettings;
        setForm({
          freeDeliveryRadius: String(next.freeDeliveryRadius ?? 0),
          extraChargePerKm: String(next.extraChargePerKm ?? 0),
          maxDeliveryRadius: String(next.maxDeliveryRadius ?? 0),
          signupBonusCredits: String(next.signupBonusCredits ?? 0),
          deliveryCutoffMinutes: String(next.deliveryCutoffMinutes ?? 0),
          walletRefundPolicy: next.walletRefundPolicy || '',
        });
      })
      .catch((err: unknown) => {
        setLoadError('Unable to load settings. Please try again.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const onSave = async () => {
    setAttemptedSave(true);
    setSaving(true);
    setLoadError(null);

    if (Object.keys(validation).length > 0) {
      toast({
        title: 'Fix validation errors',
        description: 'Please correct the highlighted fields before saving.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    const payload: AdminSettings = {
      ...emptySettings,
      ...numericPreview,
      walletRefundPolicy: form.walletRefundPolicy.trim(),
    };

    try {
      await adminSettingsService.updateSettings(payload);
      toast({ title: 'Settings updated successfully.' });
    } catch (err: unknown) {
      const message = String((err as { message?: unknown })?.message || err || 'Failed to update settings');
      setLoadError('Unable to load settings. Please try again.');
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-xl border border-oz-neutral/50 bg-oz-neutral/20 p-4 text-sm text-oz-primary">
          {loadError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Delivery & Wallet Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminFormLayout
            className={ADMIN_FORM_CONTAINER}
            actions={
              <Button
                className="h-11 rounded-xl w-full sm:w-auto"
                onClick={onSave}
                disabled={loading || saving || Object.keys(validation).length > 0}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  'Save Settings'
                )}
              </Button>
            }
            stickyActions
          >
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : (
              <div className={ADMIN_FORM_GRID}>
                <FormField label="Free delivery radius (km)" error={getFieldError('freeDeliveryRadius')}>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.freeDeliveryRadius}
                    inputMode="decimal"
                    onChange={(event) => {
                      const next = event.target.value;
                      if (next.startsWith('-')) return;
                      setTouched((prev) => ({ ...prev, freeDeliveryRadius: true }));
                      setForm((prev) => ({ ...prev, freeDeliveryRadius: next }));
                    }}
                  />
                </FormField>

                <FormField label="Extra charge per km" error={getFieldError('extraChargePerKm')}>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.extraChargePerKm}
                    inputMode="decimal"
                    onChange={(event) => {
                      const next = event.target.value;
                      if (next.startsWith('-')) return;
                      setTouched((prev) => ({ ...prev, extraChargePerKm: true }));
                      setForm((prev) => ({ ...prev, extraChargePerKm: next }));
                    }}
                  />
                </FormField>

                <FormField label="Max delivery radius (km)" error={getFieldError('maxDeliveryRadius')}>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.maxDeliveryRadius}
                    inputMode="decimal"
                    onChange={(event) => {
                      const next = event.target.value;
                      if (next.startsWith('-')) return;
                      setTouched((prev) => ({ ...prev, maxDeliveryRadius: true }));
                      setForm((prev) => ({ ...prev, maxDeliveryRadius: next }));
                    }}
                  />
                </FormField>

                <FormField label="Signup bonus credits" error={getFieldError('signupBonusCredits')}>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={form.signupBonusCredits}
                    inputMode="numeric"
                    onChange={(event) => {
                      const next = event.target.value;
                      if (next.startsWith('-')) return;
                      setTouched((prev) => ({ ...prev, signupBonusCredits: true }));
                      setForm((prev) => ({ ...prev, signupBonusCredits: next }));
                    }}
                  />
                </FormField>

                <FormField label="Delivery cutoff (minutes)" error={getFieldError('deliveryCutoffMinutes')}>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={form.deliveryCutoffMinutes}
                    inputMode="numeric"
                    onChange={(event) => {
                      const next = event.target.value;
                      if (next.startsWith('-')) return;
                      setTouched((prev) => ({ ...prev, deliveryCutoffMinutes: true }));
                      setForm((prev) => ({ ...prev, deliveryCutoffMinutes: next }));
                    }}
                  />
                </FormField>

                <FormField label="Wallet refund policy" error={getFieldError('walletRefundPolicy')} className="md:col-span-2">
                  <Textarea
                    rows={4}
                    className="min-h-[140px]"
                    value={form.walletRefundPolicy}
                    placeholder="Describe when wallet refunds apply and how they are processed."
                    onChange={(event) => {
                      setTouched((prev) => ({ ...prev, walletRefundPolicy: true }));
                      setForm((prev) => ({ ...prev, walletRefundPolicy: event.target.value }));
                    }}
                  />
                </FormField>
              </div>
            )}
          </AdminFormLayout>
        </CardContent>
      </Card>
    </div>
  );
}
