import type { Subscription, Delivery } from '@/types';
import { 
  subscriptions, 
  getSubscriptionById as getSubById,
  getUserSubscriptions as getUserSubs,
  getActiveSubscriptions as getActiveSubs,
  getTodayDelivery as getTodayDel
} from '@/data/subscriptions';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const subscriptionService = {
  // Get all subscriptions for a user
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    await delay(100);
    return getUserSubs(userId);
  },

  // Get active subscriptions only
  async getActiveSubscriptions(userId: string): Promise<Subscription[]> {
    await delay(100);
    return getActiveSubs(userId);
  },

  // Get single subscription by ID
  async getSubscriptionById(id: string): Promise<Subscription | null> {
    await delay(50);
    return getSubById(id) || null;
  },

  // Get today's delivery for user
  async getTodayDelivery(userId: string): Promise<Delivery | null> {
    await delay(50);
    return getTodayDel(userId) || null;
  },

  // Pause subscription
  async pauseSubscription(subscriptionId: string, reason: string): Promise<Subscription | null> {
    await delay(200);
    const subscription = getSubById(subscriptionId);
    
    if (subscription && subscription.status === 'active') {
      // In real app, this would update the backend
      const updated: Subscription = {
        ...subscription,
        status: 'paused',
        pauseReason: reason,
        pausedAt: new Date().toISOString(),
      };
      return updated;
    }
    
    return null;
  },

  // Resume subscription
  async resumeSubscription(subscriptionId: string): Promise<Subscription | null> {
    await delay(200);
    const subscription = getSubById(subscriptionId);
    
    if (subscription && subscription.status === 'paused') {
      const updated: Subscription = {
        ...subscription,
        status: 'active',
        pauseReason: undefined,
        pausedAt: undefined,
      };
      return updated;
    }
    
    return null;
  },

  // Skip a specific delivery
  async skipDelivery(
    subscriptionId: string, 
    deliveryId: string, 
    reason?: string
  ): Promise<{ success: boolean; creditsRefunded: number }> {
    await delay(200);
    const subscription = getSubById(subscriptionId);
    
    if (!subscription) {
      return { success: false, creditsRefunded: 0 };
    }

    const delivery = subscription.deliveries.find(d => d.id === deliveryId);
    
    if (!delivery) {
      return { success: false, creditsRefunded: 0 };
    }

    // Check if skip is allowed (must be before cutoff time)
    const deliveryDate = new Date(delivery.date);
    const now = new Date();
    const cutoffTime = new Date(deliveryDate);
    cutoffTime.setHours(6, 0, 0, 0); // 6 AM cutoff

    if (now >= cutoffTime) {
      return { success: false, creditsRefunded: 0 };
    }

    // Calculate refund (simplified - in real app would be based on pack price)
    const dailyRate = 300; // Example daily rate
    
    return { success: true, creditsRefunded: dailyRate };
  },

  // Check if delivery can be skipped
  canSkipDelivery(delivery: Delivery): boolean {
    if (delivery.isSkipped || delivery.status === 'delivered') {
      return false;
    }

    const deliveryDate = new Date(delivery.date);
    const now = new Date();
    const cutoffTime = new Date(deliveryDate);
    cutoffTime.setHours(6, 0, 0, 0);

    return now < cutoffTime;
  },

  // Get subscription status display
  getStatusDisplay(status: Subscription['status']): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
    const statusMap = {
      active: { label: 'Active', variant: 'default' as const },
      paused: { label: 'Paused', variant: 'secondary' as const },
      completed: { label: 'Completed', variant: 'outline' as const },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const },
    };
    return statusMap[status];
  },

  // Get delivery status display
  getDeliveryStatusDisplay(status: Delivery['status']): { label: string; color: string } {
    const statusMap = {
      scheduled: { label: 'Scheduled', color: 'text-muted-foreground' },
      cooking: { label: 'Cooking', color: 'text-amber-600' },
      sent: { label: 'On the way', color: 'text-blue-600' },
      delivered: { label: 'Delivered', color: 'text-green-600' },
      skipped: { label: 'Skipped', color: 'text-red-600' },
    };
    return statusMap[status];
  },
};
