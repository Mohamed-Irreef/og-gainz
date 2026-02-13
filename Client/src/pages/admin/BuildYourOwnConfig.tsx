import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { adminBuildYourOwnConfigService } from '@/services/adminBuildYourOwnConfigService';
import { AdminFormLayout, ADMIN_FORM_GRID, FormField } from '@/components/admin';

export default function AdminBuildYourOwnConfig() {
	const { toast } = useToast();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [weeklyMin, setWeeklyMin] = useState(0);
	const [monthlyMin, setMonthlyMin] = useState(0);
	const [weeklyMax, setWeeklyMax] = useState(0);
	const [monthlyMax, setMonthlyMax] = useState(0);

	useEffect(() => {
		let alive = true;
		setLoading(true);
		adminBuildYourOwnConfigService
			.get()
			.then((res) => {
				if (!alive) return;
				setWeeklyMin(Number(res.data.minimumWeeklyOrderAmount || 0));
				setMonthlyMin(Number(res.data.minimumMonthlyOrderAmount || 0));
				setWeeklyMax(Number(res.data.maximumWeeklyOrderAmount || 0));
				setMonthlyMax(Number(res.data.maximumMonthlyOrderAmount || 0));
			})
			.catch(() => {
				toast({ title: 'Failed to load config', variant: 'destructive' });
			})
			.finally(() => {
				if (!alive) return;
				setLoading(false);
			});
		return () => {
			alive = false;
		};
	}, [toast]);

	const save = async () => {
		setSaving(true);
		try {
			await adminBuildYourOwnConfigService.update({
				minimumWeeklyOrderAmount: weeklyMin,
				minimumMonthlyOrderAmount: monthlyMin,
				maximumWeeklyOrderAmount: weeklyMax,
				maximumMonthlyOrderAmount: monthlyMax,
			});
			toast({ title: 'Build-your-own rules updated' });
		} catch {
			toast({ title: 'Failed to update rules', variant: 'destructive' });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Order Rules</CardTitle>
				</CardHeader>
				<CardContent>
					<AdminFormLayout
						actions={
							<Button className="h-11 rounded-xl" onClick={save} disabled={loading || saving}>
								{saving ? 'Saving…' : 'Save'}
							</Button>
						}
					>
						<div className={ADMIN_FORM_GRID}>
							<FormField label="Minimum weekly order amount">
								<Input type="number" disabled={loading} value={String(weeklyMin)} onChange={(e) => setWeeklyMin(Number(e.target.value) || 0)} />
							</FormField>
							<FormField label="Minimum monthly order amount">
								<Input type="number" disabled={loading} value={String(monthlyMin)} onChange={(e) => setMonthlyMin(Number(e.target.value) || 0)} />
							</FormField>
							<FormField label="Maximum weekly order amount">
								<Input type="number" disabled={loading} value={String(weeklyMax)} onChange={(e) => setWeeklyMax(Number(e.target.value) || 0)} />
							</FormField>
							<FormField label="Maximum monthly order amount">
								<Input type="number" disabled={loading} value={String(monthlyMax)} onChange={(e) => setMonthlyMax(Number(e.target.value) || 0)} />
							</FormField>
						</div>
					</AdminFormLayout>
				</CardContent>
			</Card>
		</div>
	);
}
