export type Subscription = {
  start_date?: Date | string;
  end_date?: Date | string;
  delivery_time?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  deliveryTime?: string;
};

const toISODate = (value: Date | string | undefined | null) => {
  if (!value) return '';
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDaysISO = (iso: string, days: number) => {
  const s = String(iso || '').trim();
  if (!s) return '';
  const dt = new Date(`${s}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return '';
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
};

export const calculateDeliveryFee = (subscriptions: Subscription[], deliveryCostPerTrip: number): number => {
  const subs = Array.isArray(subscriptions) ? subscriptions : [];
  const cost = Number(deliveryCostPerTrip) || 0;
  if (!subs.length || !(cost > 0)) return 0;

  const deliveriesByDate = new Map<string, Set<string>>();

  for (const sub of subs) {
    const startISO = toISODate(sub?.start_date ?? sub?.startDate);
    const endISO = toISODate(sub?.end_date ?? sub?.endDate);
    const time = String(sub?.delivery_time ?? sub?.deliveryTime ?? '').trim();
    if (!startISO || !endISO || !time) continue;
    if (endISO < startISO) continue;

    for (let dateISO = startISO; dateISO <= endISO; dateISO = addDaysISO(dateISO, 1)) {
      if (!dateISO) break;
      let set = deliveriesByDate.get(dateISO);
      if (!set) {
        set = new Set();
        deliveriesByDate.set(dateISO, set);
      }
      set.add(time);
    }
  }

  let total = 0;
  for (const set of deliveriesByDate.values()) {
    total += set.size * cost;
  }

  return total;
};
