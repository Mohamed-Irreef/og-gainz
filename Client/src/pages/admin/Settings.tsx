import { useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminFormLayout, ADMIN_FORM_GRID, FormField } from '@/components/admin';
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
  const [error, setError] = useState<string | null>(null);

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

    return errors;
  }, [form.walletRefundPolicy, numericPreview]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    adminSettingsService
      .getSettings({ signal: controller.signal })
      .then((data) => {
        setForm({
          freeDeliveryRadius: String(data.freeDeliveryRadius ?? 0),
          extraChargePerKm: String(data.extraChargePerKm ?? 0),
          maxDeliveryRadius: String(data.maxDeliveryRadius ?? 0),
          signupBonusCredits: String(data.signupBonusCredits ?? 0),
          deliveryCutoffMinutes: String(data.deliveryCutoffMinutes ?? 0),
          walletRefundPolicy: data.walletRefundPolicy || '',
        });
      })
      .catch((err: unknown) => {
        setError(String((err as { message?: unknown })?.message || err || 'Failed to load settings'));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError(null);

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
      toast({ title: 'Settings updated', description: 'Admin settings have been saved.' });
    } catch (err: unknown) {
      const message = String((err as { message?: unknown })?.message || err || 'Failed to update settings');
      setError(message);
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load settings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Delivery & Wallet Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminFormLayout
            className="space-y-6"
            actions={
              <Button className="h-11 rounded-xl" onClick={onSave} disabled={loading || saving || Object.keys(validation).length > 0}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            }
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
                <FormField label="Free delivery radius (km)" error={validation.freeDeliveryRadius}>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.freeDeliveryRadius}
                    onChange={(event) => setForm((prev) => ({ ...prev, freeDeliveryRadius: event.target.value }))}
                  />
                </FormField>

                <FormField label="Extra charge per km" error={validation.extraChargePerKm}>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.extraChargePerKm}
                    onChange={(event) => setForm((prev) => ({ ...prev, extraChargePerKm: event.target.value }))}
                  />
                </FormField>

                <FormField label="Max delivery radius (km)" error={validation.maxDeliveryRadius}>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.maxDeliveryRadius}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxDeliveryRadius: event.target.value }))}
                  />
                </FormField>

                <FormField label="Signup bonus credits" error={validation.signupBonusCredits}>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={form.signupBonusCredits}
                    onChange={(event) => setForm((prev) => ({ ...prev, signupBonusCredits: event.target.value }))}
                  />
                </FormField>

                <FormField label="Delivery cutoff (minutes)" error={validation.deliveryCutoffMinutes}>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={form.deliveryCutoffMinutes}
                    onChange={(event) => setForm((prev) => ({ ...prev, deliveryCutoffMinutes: event.target.value }))}
                  />
                </FormField>

                <FormField label="Wallet refund policy" error={validation.walletRefundPolicy} className="md:col-span-2">
                  <Textarea
                    rows={4}
                    className="min-h-[120px]"
                    value={form.walletRefundPolicy}
                    onChange={(event) => setForm((prev) => ({ ...prev, walletRefundPolicy: event.target.value }))}
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
