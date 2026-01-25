import type { Subscription, Delivery } from '@/types';

// Generate deliveries for a subscription
const generateDeliveries = (
  startDate: Date,
  days: number
): Delivery[] => {
  const deliveries: Delivery[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Determine status based on date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(date);
    deliveryDate.setHours(0, 0, 0, 0);
    
    let status: Delivery['status'] = 'scheduled';
    if (deliveryDate < today) {
      status = 'delivered';
    } else if (deliveryDate.getTime() === today.getTime()) {
      status = 'cooking';
    }
    
    deliveries.push({
      id: `delivery-${i + 1}`,
      date: date.toISOString().split('T')[0],
      status,
      deliveryTime: '12:00 - 13:00',
      isSkipped: false,
    });
  }
  
  return deliveries;
};

// Sample subscriptions
export const subscriptions: Subscription[] = [
  {
    id: 'sub-001',
    userId: 'user-001',
    mealPackId: 'signature-pack',
    mealPackName: 'Signature Pack',
    type: 'weekly',
    status: 'active',
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalServings: 7,
    remainingServings: 4,
    deliveries: generateDeliveries(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), 7),
    addOns: [
      { addOnId: 'extra-chicken', quantity: 1, isSubscription: true },
    ],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'sub-002',
    userId: 'user-001',
    mealPackId: 'elite-pack',
    mealPackName: 'Elite Pack',
    type: 'monthly',
    status: 'active',
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalServings: 30,
    remainingServings: 20,
    deliveries: generateDeliveries(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), 30),
    addOns: [
      { addOnId: 'whey-shake', quantity: 1, isSubscription: true },
      { addOnId: 'mixed-salad', quantity: 1, isSubscription: true },
    ],
    createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'sub-003',
    userId: 'user-002',
    mealPackId: 'signature-pack',
    mealPackName: 'Signature Pack',
    type: 'trial',
    status: 'completed',
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalServings: 5,
    remainingServings: 0,
    deliveries: generateDeliveries(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), 5),
    addOns: [],
    createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const getSubscriptionById = (id: string): Subscription | undefined => {
  return subscriptions.find(sub => sub.id === id);
};

export const getUserSubscriptions = (userId: string): Subscription[] => {
  return subscriptions.filter(sub => sub.userId === userId);
};

export const getActiveSubscriptions = (userId: string): Subscription[] => {
  return subscriptions.filter(sub => sub.userId === userId && sub.status === 'active');
};

export const getTodayDelivery = (userId: string): Delivery | undefined => {
  const today = new Date().toISOString().split('T')[0];
  const activeSubscriptions = getActiveSubscriptions(userId);
  
  for (const sub of activeSubscriptions) {
    const todayDelivery = sub.deliveries.find(d => d.date === today);
    if (todayDelivery) {
      return todayDelivery;
    }
  }
  
  return undefined;
};
