import { apiJsonNoCache } from './apiClient';

type AdminDashboardResponse = {
	stats: {
		totalOrders: number;
		activeSubscriptions: number;
		totalUsers: number;
		pendingConsultations: number;
	};
	growth: {
		ordersWeeklyPercent: number;
		subscriptionsMonthlyPercent: number;
		newUsersToday: number;
	};
	revenue: {
		today: number;
		thisWeek: number;
		thisMonth: number;
	};
	recentConsultations: Array<{
		_id: string;
		fullName: string;
		whatsappNumber: string;
		fitnessGoal: string;
		createdAt: string;
		isRead: boolean;
	}>;
};

export const adminDashboardService = {
	async getDashboardData(): Promise<AdminDashboardResponse> {
		return apiJsonNoCache<AdminDashboardResponse>('/admin/dashboard', { method: 'GET' });
	},
};

export type { AdminDashboardResponse };
