
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { motion } from 'framer-motion';
import {
  Filter,
  ImagePlus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UtensilsCrossed,
  Pencil,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { adminMealsService } from '@/services/adminMealsService';
import { adminMealTypesService } from '@/services/adminMealTypesService';
import { adminIncludedItemsService } from '@/services/adminIncludedItemsService';
import { formatCurrency } from '@/utils/formatCurrency';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import type {
	Meal,
	MealType,
	MealPricing,
	ProteinPricingMode,
	MealTypeEntity,
	IncludedItemEntity,
	MealIncludedItemAssignment,
	IncludedItemUnit,
	IncludedItemVisibility,
} from '@/types/catalog';

type MealTypeFilter = MealType | 'all';
type AdminMeal = Meal & {
  isActive: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
type ActiveFilter = 'all' | 'active' | 'inactive';
type FeaturedFilter = 'all' | 'featured' | 'not_featured';
type TrialFilter = 'all' | 'trial' | 'not_trial';

const INCLUDED_ITEM_VISIBILITY: IncludedItemVisibility[] = ['both', 'with-protein', 'without-protein'];
const INCLUDED_ITEM_UNITS: IncludedItemUnit[] = ['g', 'kg', 'ml', 'l', 'pieces', 'pcs'];
const MEAL_TOTAL_QUANTITY_UNITS: IncludedItemUnit[] = ['g', 'kg', 'ml', 'l', 'pieces'];

const DEFAULT_PRICING: MealPricing = {
	weekly: { price: 0, servings: 5 },
	monthly: { price: 0, servings: 20 },
	trial: { price: 0, servings: 1 },
};

const safeNumber = (value: string) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};

const clampInt = (value: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
	return Math.max(min, Math.min(max, Math.round(value)));
};

const emptyDraft = (): Partial<AdminMeal> => ({
	name: '',
	slug: '',
	shortDescription: '',
	detailedDescription: '',
	proteinPerMeal: 0,
	totalQuantity: undefined,
	totalQuantityUnit: 'g',
	caloriesRange: '',
	mealType: '',
	mealTypeId: undefined,
	hasWithProteinOption: true,
	hasWithoutProteinOption: false,
	pricing: { ...DEFAULT_PRICING },
	proteinPricingMode: 'default',
	proteinPricing: undefined,
	includedItems: {},
	includedItemAssignments: [],
	trialBadgeText: '',
	displayOrder: 0,
	tags: [],
	isTrialEligible: false,
	isFeatured: false,
	isActive: true,
});

function AdminMeals() {
		const { toast } = useToast();
		const [loading, setLoading] = useState(true);
		const [error, setError] = useState<string | null>(null);
		const [items, setItems] = useState<AdminMeal[]>([]);
		const [page, setPage] = useState(1);
		const [query, setQuery] = useState('');
		const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
		const [mealTypeFilter, setMealTypeFilter] = useState<MealType | 'all'>('all');
		const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>('all');
		const [trialFilter, setTrialFilter] = useState<TrialFilter>('all');

		const hasNextPage = useRef(true);

		const [mealTypes, setMealTypes] = useState<MealTypeEntity[]>([]);
		const [includedItemsCatalog, setIncludedItemsCatalog] = useState<IncludedItemEntity[]>([]);

		const [createOpen, setCreateOpen] = useState(false);
		const [createDraft, setCreateDraft] = useState<Partial<AdminMeal>>(emptyDraft());
		const [createPricingTab, setCreatePricingTab] = useState<'weekly' | 'monthly' | 'trial'>('weekly');
		const [createProteinTier, setCreateProteinTier] = useState<'with' | 'without'>('with');
		const [createTags, setCreateTags] = useState('');
		const [creating, setCreating] = useState(false);

		const [editOpen, setEditOpen] = useState(false);
		const [editItem, setEditItem] = useState<AdminMeal | null>(null);
		const [editDraft, setEditDraft] = useState<Partial<AdminMeal>>(emptyDraft());
		const [editPricingTab, setEditPricingTab] = useState<'weekly' | 'monthly' | 'trial'>('weekly');
		const [editProteinTier, setEditProteinTier] = useState<'with' | 'without'>('with');
		const [editTags, setEditTags] = useState('');
		const [saving, setSaving] = useState(false);
		const [uploading, setUploading] = useState(false);
		const [uploadPct, setUploadPct] = useState<number | undefined>(undefined);
		const [uploadFile, setUploadFile] = useState<File | null>(null);
		const [uploadAlt, setUploadAlt] = useState('');
		const [addFiles, setAddFiles] = useState<File[]>([]);
		const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
		const replacePickerRef = useRef<HTMLInputElement | null>(null);
		const catalogsLoadedRef = useRef(false);

	useEffect(() => {
		if (catalogsLoadedRef.current) return;
		catalogsLoadedRef.current = true;

		(async () => {
			try {
				const [typesRes, itemsRes] = await Promise.all([
					adminMealTypesService.list({ page: 1, limit: 200, isActive: true }),
					adminIncludedItemsService.list({ page: 1, limit: 500, isActive: true }),
				]);
				setMealTypes(typesRes.data || []);
				setIncludedItemsCatalog(itemsRes.data || []);
			} catch {
				setMealTypes([]);
				setIncludedItemsCatalog([]);
			}
		})();
	}, []);

	const parseTags = (value: string) =>
		value
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);

	const mealTypeOptions = mealTypes.map((t) => ({ slug: t.slug, name: t.name }));

	const mealTypeIdBySlug = (slug: string) => {
		const found = mealTypes.find((t) => t.slug === slug);
		return found?.id;
	};

	useEffect(() => {
		if (!createOpen) return;
		if (!mealTypes.length) return;
		setCreateDraft((d) => {
			const currentType = String((d as unknown as { mealType?: unknown }).mealType || '').trim();
			const currentTypeId = String((d as unknown as { mealTypeId?: unknown }).mealTypeId || '').trim();
			if (currentType || currentTypeId) return d;
			return { ...d, mealType: mealTypes[0].slug, mealTypeId: mealTypes[0].id };
		});
	}, [createOpen, mealTypes]);

	const getMode = (draft: Partial<AdminMeal>): ProteinPricingMode => {
		const mode = (draft as unknown as { proteinPricingMode?: ProteinPricingMode }).proteinPricingMode;
		return (mode || 'default') as ProteinPricingMode;
	};

	const getProteinPreview = (meal: Meal) => {
		const mode = meal.proteinPricingMode || 'default';
		if (mode === 'default') return `${meal.proteinPerMeal}g`;
		if (mode === 'with-only') return `${meal.proteinPerMealWith ?? meal.proteinPerMeal}g (with)`;
		if (mode === 'without-only') return `${meal.proteinPerMealWithout ?? meal.proteinPerMeal}g (without)`;
		// both
		const withG = meal.proteinPerMealWith ?? meal.proteinPerMeal;
		const withoutG = meal.proteinPerMealWithout ?? meal.proteinPerMeal;
		return `${withG}g (with) · ${withoutG}g (without)`;
	};

	const ensureProteinPricing = (draft: Partial<AdminMeal>) => {
		const pp = (draft as unknown as { proteinPricing?: unknown }).proteinPricing;
		return (pp && typeof pp === 'object' ? (pp as NonNullable<Meal['proteinPricing']>) : {}) as NonNullable<Meal['proteinPricing']>;
	};

	const pickPricingForMode = (draft: Partial<AdminMeal>, bothTier: 'with' | 'without' = 'with') => {
		const mode = getMode(draft);
		if (mode === 'default') return { root: 'pricing' as const, pricing: (draft.pricing as MealPricing | undefined) || DEFAULT_PRICING };
		const pp = ensureProteinPricing(draft);
		if (mode === 'with-only') {
			return { root: 'proteinPricing.withProtein' as const, pricing: (pp.withProtein as MealPricing | undefined) || DEFAULT_PRICING };
		}
		if (mode === 'without-only') {
			return { root: 'proteinPricing.withoutProtein' as const, pricing: (pp.withoutProtein as MealPricing | undefined) || DEFAULT_PRICING };
		}
		// both: editable tier selected by UI
		if (bothTier === 'without') {
			return { root: 'proteinPricing.withoutProtein' as const, pricing: (pp.withoutProtein as MealPricing | undefined) || DEFAULT_PRICING };
		}
		return { root: 'proteinPricing.withProtein' as const, pricing: (pp.withProtein as MealPricing | undefined) || DEFAULT_PRICING };
	};

	const getAssignments = (draft: Partial<AdminMeal>): MealIncludedItemAssignment[] => {
		const raw = (draft as unknown as { includedItemAssignments?: unknown }).includedItemAssignments;
		return Array.isArray(raw) ? (raw as MealIncludedItemAssignment[]) : [];
	};

	const toggleAssignment = (
		setter: Dispatch<SetStateAction<Partial<AdminMeal>>>,
		item: IncludedItemEntity,
		checked: boolean
	) => {
		setter((d) => {
			const current = getAssignments(d);
			const exists = current.some((a) => a.itemId === item.id);
			if (checked) {
				if (exists) return d;
				return {
					...d,
					includedItemAssignments: [
						...current,
						{
							itemId: item.id,
							quantity: 1,
							unit: (item.defaultUnit || 'g') as IncludedItemUnit,
							visibility: 'both',
							isActive: true,
							displayOrder: item.displayOrder,
						},
					],
				};
			}
			return {
				...d,
				includedItemAssignments: current.filter((a) => a.itemId !== item.id),
			};
		});
	};

	const patchAssignment = (
		setter: Dispatch<SetStateAction<Partial<AdminMeal>>>,
		itemId: string,
		patch: Partial<MealIncludedItemAssignment>
	) => {
		setter((d) => {
			const current = getAssignments(d);
			return {
				...d,
				includedItemAssignments: current.map((a) => (a.itemId === itemId ? { ...a, ...patch } : a)),
			};
		});
	};

	const canSubmitDraft = (draft: Partial<AdminMeal>) => {
		return Boolean(String(draft.name || '').trim()) && Boolean(String((draft as unknown as { mealTypeId?: string }).mealTypeId || draft.mealType || '').trim());
	};

	const resetCreate = () => {
		setCreateDraft(emptyDraft());
		setCreatePricingTab('weekly');
		setCreateTags('');
		setCreating(false);
	};

	const fetchMeals = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await adminMealsService.list({
				page,
				limit: 20,
				q: query.trim() ? query.trim() : undefined,
				isActive:
					activeFilter === 'all'
						? undefined
						: activeFilter === 'active'
							? true
							: false,
				mealType: mealTypeFilter === 'all' ? undefined : mealTypeFilter,
				isFeatured:
					featuredFilter === 'all'
						? undefined
						: featuredFilter === 'featured'
							? true
							: false,
				isTrialEligible:
					trialFilter === 'all'
						? undefined
						: trialFilter === 'trial'
							? true
							: false,
			});
			setItems(res.data);
			hasNextPage.current = Boolean(res.meta?.hasNextPage);
		} catch (e) {
			hasNextPage.current = false;
			setItems([]);
			setError('Failed to load meals');
		} finally {
			setLoading(false);
		}
	}, [page, query, activeFilter, mealTypeFilter, featuredFilter, trialFilter]);

	useEffect(() => {
		void fetchMeals();
	}, [fetchMeals]);

	const openEdit = (meal: AdminMeal) => {
		setEditItem(meal);
		setEditDraft({
			...meal,
			mealTypeId: meal.mealTypeId || meal.mealTypeRef?.id || (mealTypes.find((t) => t.slug === meal.mealType)?.id ?? undefined),
			proteinPricingMode: meal.proteinPricingMode || 'default',
		});
		setEditTags((meal.tags || []).join(', '));
		setEditPricingTab('weekly');
		setUploadAlt(meal.image?.alt || '');
		setUploadFile(null);
		setAddFiles([]);
		setReplaceIndex(null);
		setUploadPct(undefined);
		setEditOpen(true);
	};

	const handleToggle = async (meal: AdminMeal, changes: Partial<AdminMeal>) => {
		try {
			const res = await adminMealsService.update(meal.id, changes);
			setItems((prev) => prev.map((m) => (m.id === meal.id ? { ...m, ...res.data } : m)));
			toast({ title: 'Updated', description: meal.name });
		} catch (e) {
			toast({ title: 'Error', description: 'Update failed.', variant: 'destructive' });
		}
	};

	const handleCreate = async () => {
		if (!canSubmitDraft(createDraft)) {
			toast({ title: 'Missing required fields', description: 'Please provide a meal name and meal type.', variant: 'destructive' });
			return;
		}
		setCreating(true);
		try {
			const payload: Partial<AdminMeal> = (() => {
				const next: Partial<AdminMeal> = {
					...createDraft,
					tags: parseTags(createTags),
				};
				const tq = (next as unknown as { totalQuantity?: unknown }).totalQuantity;
				const totalQuantity = typeof tq === 'number' && Number.isFinite(tq) && tq > 0 ? tq : undefined;
				if (!totalQuantity) {
					delete (next as unknown as { totalQuantity?: unknown }).totalQuantity;
					delete (next as unknown as { totalQuantityUnit?: unknown }).totalQuantityUnit;
				}
				return next;
			})();
			const res = await adminMealsService.create(payload);
			toast({ title: 'Meal created', description: res.data.name });
			setCreateOpen(false);
			resetCreate();
			await fetchMeals();
		} catch (e) {
			toast({ title: 'Error', description: 'Failed to create meal.', variant: 'destructive' });
		} finally {
			setCreating(false);
		}
	};

	const handleSave = async () => {
		if (!editItem) return;
		if (!canSubmitDraft(editDraft)) {
			toast({ title: 'Missing required fields', description: 'Please provide a meal name and meal type.', variant: 'destructive' });
			return;
		}

		setSaving(true);
		try {
			const tags = parseTags(editTags);
			const payload: Partial<AdminMeal> = (() => {
				// Images are managed via dedicated endpoints; never overwrite on general update.
				const { image: _image, images: _images, ...rest } = editDraft as Partial<AdminMeal> & {
					image?: unknown;
					images?: unknown;
				};
				return { ...rest, tags };
			})();

			if (!payload.isTrialEligible && payload.pricing) {
				payload.pricing = { ...payload.pricing, trial: undefined };
				payload.trialBadgeText = '';
			}

			const res = await adminMealsService.update(editItem.id, payload);
			setItems((prev) => prev.map((m) => (m.id === editItem.id ? { ...m, ...res.data } : m)));
			setEditItem(res.data);
			setEditDraft({ ...res.data });
			setEditTags((res.data.tags || []).join(', '));
			toast({ title: 'Saved', description: res.data.name });
			setEditOpen(false);
		} catch (e) {
			toast({ title: 'Error', description: 'Save failed.', variant: 'destructive' });
		} finally {
			setSaving(false);
		}
	};

	const handleSoftDelete = (meal: AdminMeal) => handleDelete(meal);

	// --- Begin moved orphaned logic ---
	const handleDelete = async (meal: AdminMeal) => {
		try {
			await adminMealsService.softDelete(meal.id);
			toast({ title: 'Meal deleted', description: meal.name });
			await fetchMeals();
		} catch (e) {
			toast({ title: 'Error', description: 'Failed to delete meal.', variant: 'destructive' });
		}
	};

	const handleUpload = async () => {
		if (!editItem || !uploadFile) return;
		setUploading(true);
		setUploadPct(0);
		try {
			const existingImages = editItem.images?.length ? editItem.images : editItem.image ? [editItem.image] : [];
			const res = existingImages.length
				? await adminMealsService.replaceImageAtIndex(editItem.id, 0, uploadFile, {
					onProgress: (pct: number) => setUploadPct(pct),
					alt: uploadAlt.trim() || undefined,
				})
				: await adminMealsService.addImages(editItem.id, [uploadFile], {
					onProgress: (pct: number) => setUploadPct(pct),
					alt: uploadAlt.trim() || undefined,
				});
			setItems((prev) => prev.map((m) => (m.id === editItem.id ? { ...m, ...res.data } : m)));
			setEditItem((prev) => (prev ? { ...prev, ...res.data } : prev));
			setUploadFile(null);
			setUploadAlt(res.data.image?.alt || uploadAlt);
			toast({ title: existingImages.length ? 'Primary image replaced' : 'Image added', description: editItem.name });
		} catch (e) {
			toast({ title: 'Error', description: 'Image upload failed.', variant: 'destructive' });
		} finally {
			setUploading(false);
			setUploadPct(undefined);
		}
	};

	const handleAddImages = async () => {
		if (!editItem || !addFiles.length) return;
		setUploading(true);
		setUploadPct(0);
		try {
			const res = await adminMealsService.addImages(editItem.id, addFiles, {
				onProgress: (pct: number) => setUploadPct(pct),
			});
			setItems((prev) => prev.map((m) => (m.id === editItem.id ? { ...m, ...res.data } : m)));
			setEditItem((prev) => (prev ? { ...prev, ...res.data } : prev));
			setAddFiles([]);
			toast({ title: 'Images added', description: editItem.name });
		} catch {
			toast({ title: 'Error', description: 'Failed to add images.', variant: 'destructive' });
		} finally {
			setUploading(false);
			setUploadPct(undefined);
		}
	};

	const handleDeleteImageAtIndex = async (index: number) => {
		if (!editItem) return;
		try {
			const res = await adminMealsService.deleteImageAtIndex(editItem.id, index);
			setItems((prev) => prev.map((m) => (m.id === editItem.id ? { ...m, ...res.data } : m)));
			setEditItem((prev) => (prev ? { ...prev, ...res.data } : prev));
			toast({ title: 'Image deleted', description: editItem.name });
		} catch {
			toast({ title: 'Error', description: 'Failed to delete image.', variant: 'destructive' });
		}
	};

	const handleMakePrimary = async (index: number) => {
		if (!editItem) return;
		try {
			const res = await adminMealsService.makePrimaryImage(editItem.id, index);
			setItems((prev) => prev.map((m) => (m.id === editItem.id ? { ...m, ...res.data } : m)));
			setEditItem((prev) => (prev ? { ...prev, ...res.data } : prev));
			toast({ title: 'Primary image updated', description: editItem.name });
		} catch {
			toast({ title: 'Error', description: 'Failed to set primary image.', variant: 'destructive' });
		}
	};

	const triggerReplacePicker = (index: number) => {
		setReplaceIndex(index);
		replacePickerRef.current?.click();
	};

	const handleReplacePicked = async (file: File) => {
		if (!editItem) return;
		if (replaceIndex === null) return;
		setUploading(true);
		setUploadPct(0);
		try {
			const res = await adminMealsService.replaceImageAtIndex(editItem.id, replaceIndex, file, {
				onProgress: (pct: number) => setUploadPct(pct),
			});
			setItems((prev) => prev.map((m) => (m.id === editItem.id ? { ...m, ...res.data } : m)));
			setEditItem((prev) => (prev ? { ...prev, ...res.data } : prev));
			toast({ title: 'Image replaced', description: editItem.name });
		} catch {
			toast({ title: 'Error', description: 'Failed to replace image.', variant: 'destructive' });
		} finally {
			setUploading(false);
			setUploadPct(undefined);
			setReplaceIndex(null);
		}
	};
	// --- End moved orphaned logic ---

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
				<div>
					<div className="flex items-center gap-2">
						<UtensilsCrossed className="w-5 h-5 text-oz-secondary" />
						<h2 className="text-xl font-semibold text-oz-primary">Meals</h2>
					</div>
					<p className="text-sm text-muted-foreground">Create, edit, feature, and manage visibility.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={fetchMeals} disabled={loading}>
						<RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</Button>
					<Button onClick={() => setCreateOpen(true)}>
						<Plus className="w-4 h-4 mr-2" />
						New Meal
					</Button>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="p-4">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								placeholder="Search by name or slug…"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								className="pl-9"
							/>
						</div>
						<Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as ActiveFilter)}>
							<SelectTrigger className="w-full sm:w-44">
								<Filter className="w-4 h-4 mr-2" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
							</SelectContent>
						</Select>
						<Select value={mealTypeFilter} onValueChange={(v) => setMealTypeFilter(v as MealTypeFilter)}>
							<SelectTrigger className="w-full sm:w-44">
								<SelectValue placeholder="Meal type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All types</SelectItem>
								{mealTypeOptions.map((t) => (
									<SelectItem key={t.slug} value={t.slug}>
										{t.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={featuredFilter} onValueChange={(v) => setFeaturedFilter(v as FeaturedFilter)}>
							<SelectTrigger className="w-full sm:w-44">
								<SelectValue placeholder="Featured" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="featured">Featured</SelectItem>
								<SelectItem value="not_featured">Not featured</SelectItem>
							</SelectContent>
						</Select>
						<Select value={trialFilter} onValueChange={(v) => setTrialFilter(v as TrialFilter)}>
							<SelectTrigger className="w-full sm:w-44">
								<SelectValue placeholder="Trial" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="trial">Trial eligible</SelectItem>
								<SelectItem value="not_trial">Not trial</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* List */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-lg">Catalog</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{loading ? (
						<div className="p-4 space-y-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<Skeleton key={i} className="h-20 w-full" />
							))}
						</div>
					) : error ? (
						<div className="text-center py-12 text-muted-foreground">
							<p className="font-medium">{error}</p>
							<p className="text-sm">Try refreshing.</p>
						</div>
					) : items.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							<p className="font-medium">No meals found</p>
							<p className="text-sm">Create a meal to get started.</p>
						</div>
					) : (
						<div className="divide-y divide-border">
							{items.map((meal, index) => (
								<motion.div
									key={meal.id}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: Math.min(index * 0.03, 0.35) }}
									className="p-4 hover:bg-muted/30 transition-colors"
								>
									<div className="flex flex-col lg:flex-row lg:items-center gap-4">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className="w-16 h-12 rounded-lg overflow-hidden bg-muted shrink-0 border">
												{meal.image?.url ? (
													<img src={meal.image.url} alt={meal.image.alt || meal.name} className="w-full h-full object-cover" loading="lazy" />
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<ImagePlus className="w-4 h-4 text-muted-foreground" />
													</div>
												)}
											</div>
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<p className="font-semibold truncate">{meal.name}</p>
													<Badge variant="outline" className="capitalize">{meal.mealType}</Badge>
													{meal.isFeatured && <Badge variant="secondary">Featured</Badge>}
													{meal.isTrialEligible && <Badge variant="outline">Trial</Badge>}
													{!meal.isActive && <Badge variant="destructive">Inactive</Badge>}
												</div>
												<p className="text-xs text-muted-foreground truncate">/{meal.slug}</p>
												<p className="text-sm text-muted-foreground line-clamp-1">{meal.shortDescription || meal.description}</p>
											</div>
										</div>

										<div className="flex flex-wrap items-center gap-3">
											<div className="text-sm font-semibold">
												{formatCurrency(meal.pricing?.weekly?.price ?? meal.price ?? 0)}
												<span className="text-xs text-muted-foreground"> / week</span>
											</div>
											<div className="text-sm font-semibold">
												{formatCurrency(meal.pricing?.monthly?.price ?? 0)}
												<span className="text-xs text-muted-foreground"> / month</span>
											</div>
											<div className="text-xs text-muted-foreground">{getProteinPreview(meal)} · order {meal.displayOrder ?? 0}</div>
										</div>

										<div className="flex flex-wrap items-center gap-3 justify-between lg:justify-end">
											<div className="flex items-center gap-2">
												<span className="text-xs text-muted-foreground">Active</span>
												<Switch
													checked={meal.isActive}
													onCheckedChange={(checked) => handleToggle(meal, { isActive: checked })}
												/>
											</div>
											<div className="flex items-center gap-2">
												<span className="text-xs text-muted-foreground">Featured</span>
												<Switch
													checked={meal.isFeatured}
													onCheckedChange={(checked) => handleToggle(meal, { isFeatured: checked })}
												/>
											</div>
											<Button variant="outline" size="sm" onClick={() => openEdit(meal)}>
												<Pencil className="w-4 h-4 mr-2" />
												Edit
											</Button>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button variant="destructive" size="sm">
														<Trash2 className="w-4 h-4 mr-2" />
														Delete
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>Delete meal?</AlertDialogTitle>
														<AlertDialogDescription>
															This permanently deletes the meal.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<AlertDialogAction onClick={() => handleSoftDelete(meal)}>Delete</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
									</div>
								</motion.div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
					Prev
				</Button>
				<div className="text-xs text-muted-foreground">Page {page}</div>
				<Button
					variant="outline"
					disabled={loading || !hasNextPage.current}
					onClick={() => setPage((p) => p + 1)}
				>
					Next
				</Button>
			</div>

			{/* Create Dialog */}
			<Dialog open={createOpen} onOpenChange={(open) => {
				setCreateOpen(open);
				if (!open) resetCreate();
			}}>
				<DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
					<DialogHeader>
						<DialogTitle>New Meal</DialogTitle>
						<DialogDescription>Create a meal pack with Phase-3 pricing tiers, included items, and display ordering.</DialogDescription>
					</DialogHeader>

					<ScrollArea className="max-h-[70vh] pr-4">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Name</Label>
								<Input
									value={String(createDraft.name || '')}
									onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))}
									placeholder="e.g. High Protein Pack"
								/>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Meal Type</Label>
										<Select
											disabled={!mealTypeOptions.length}
											value={String(createDraft.mealType || '')}
											onValueChange={(v) =>
												setCreateDraft((d) => ({
													...d,
													mealType: v as MealType,
													mealTypeId: mealTypeIdBySlug(String(v)) || (d as unknown as { mealTypeId?: string }).mealTypeId,
												}))
											}
										>
											<SelectTrigger>
												<SelectValue placeholder={mealTypeOptions.length ? 'Meal type' : 'Create a meal type first'} />
											</SelectTrigger>
										<SelectContent>
											{mealTypeOptions.map((t) => (
													<SelectItem key={t.slug} value={t.slug}>
													{t.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Slug (optional)</Label>
									<Input value={String(createDraft.slug || '')} onChange={(e) => setCreateDraft((d) => ({ ...d, slug: e.target.value }))} placeholder="auto-generated if empty" />
								</div>
							</div>

							<div className="space-y-2">
								<Label>Short Description</Label>
								<Textarea value={String(createDraft.shortDescription || '')} onChange={(e) => setCreateDraft((d) => ({ ...d, shortDescription: e.target.value }))} rows={3} />
							</div>

							<div className="space-y-2">
								<Label>Detailed Description (optional)</Label>
								<Textarea value={String(createDraft.detailedDescription || '')} onChange={(e) => setCreateDraft((d) => ({ ...d, detailedDescription: e.target.value }))} rows={5} />
							</div>

							<div className="space-y-2">
								<Label>Protein Pricing Mode</Label>
								<Select
									value={String(getMode(createDraft))}
									onValueChange={(v) => {
										const mode = v as ProteinPricingMode;
										setCreateDraft((d) => {
											const next: Partial<AdminMeal> = { ...d, proteinPricingMode: mode };
											if (mode === 'with-only') {
												next.hasWithProteinOption = true;
												next.hasWithoutProteinOption = false;
											}
											if (mode === 'without-only') {
												next.hasWithProteinOption = false;
												next.hasWithoutProteinOption = true;
											}
											if (mode === 'both') {
												next.hasWithProteinOption = true;
												next.hasWithoutProteinOption = true;
											}
											if (mode !== 'default') {
												const pp = ensureProteinPricing(next);
												(next as unknown as { proteinPricing?: Meal['proteinPricing'] }).proteinPricing = {
													...pp,
													withProtein: pp.withProtein || { ...DEFAULT_PRICING },
													withoutProtein: pp.withoutProtein || { ...DEFAULT_PRICING },
												};
											}
											return next;
										});
										if (mode === 'both') setCreateProteinTier('with');
									}}
								>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="default">Default</SelectItem>
										<SelectItem value="with-only">With-only</SelectItem>
										<SelectItem value="without-only">Without-only</SelectItem>
										<SelectItem value="both">Both</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Pricing</Label>
								{(() => {
									const mode = getMode(createDraft);
									const picked = pickPricingForMode(createDraft, createProteinTier);
									const pricing = picked.pricing;
									const setPricing = (patch: (p: MealPricing) => MealPricing) => {
										setCreateDraft((d) => {
											if (mode === 'default') {
												return { ...d, pricing: patch((d.pricing as MealPricing | undefined) || DEFAULT_PRICING) };
											}
											const pp = ensureProteinPricing(d);
											if (picked.root === 'proteinPricing.withProtein') {
												return { ...d, proteinPricing: { ...pp, withProtein: patch((pp.withProtein as MealPricing | undefined) || DEFAULT_PRICING) } };
											}
											return { ...d, proteinPricing: { ...pp, withoutProtein: patch((pp.withoutProtein as MealPricing | undefined) || DEFAULT_PRICING) } };
										});
									};

									return (
										<div className="space-y-3">
											{mode === 'both' && (
												<Tabs value={createProteinTier} onValueChange={(v) => setCreateProteinTier(v as typeof createProteinTier)}>
													<TabsList className="w-full justify-start">
														<TabsTrigger value="with">With Protein</TabsTrigger>
														<TabsTrigger value="without">Without Protein</TabsTrigger>
													</TabsList>
												</Tabs>
											)}

											<Tabs value={createPricingTab} onValueChange={(v) => setCreatePricingTab(v as typeof createPricingTab)}>
												<TabsList className="w-full justify-start">
													<TabsTrigger value="weekly">Weekly</TabsTrigger>
													<TabsTrigger value="monthly">Monthly</TabsTrigger>
													<TabsTrigger value="trial" disabled={!createDraft.isTrialEligible}>Trial</TabsTrigger>
												</TabsList>
												<TabsContent value="weekly">
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
														<div className="space-y-2">
															<Label>Weekly Price (INR)</Label>
															<Input
																type="number"
																min={0}
																value={String(pricing.weekly?.price ?? 0)}
																onChange={(e) => setPricing((p) => ({ ...p, weekly: { ...p.weekly, price: safeNumber(e.target.value) } }))}
															/>
														</div>
														<div className="space-y-2">
															<Label>Weekly Servings</Label>
															<Input
																type="number"
																min={1}
																value={String(pricing.weekly?.servings ?? 5)}
																onChange={(e) => setPricing((p) => ({ ...p, weekly: { ...p.weekly, servings: clampInt(safeNumber(e.target.value), 1) } }))}
															/>
														</div>
													</div>
												</TabsContent>
												<TabsContent value="monthly">
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
														<div className="space-y-2">
															<Label>Monthly Price (INR)</Label>
															<Input
																type="number"
																min={0}
																value={String(pricing.monthly?.price ?? 0)}
																onChange={(e) => setPricing((p) => ({ ...p, monthly: { ...p.monthly, price: safeNumber(e.target.value) } }))}
															/>
														</div>
														<div className="space-y-2">
															<Label>Monthly Servings</Label>
															<Input
																type="number"
																min={1}
																value={String(pricing.monthly?.servings ?? 20)}
																onChange={(e) => setPricing((p) => ({ ...p, monthly: { ...p.monthly, servings: clampInt(safeNumber(e.target.value), 1) } }))}
															/>
														</div>
													</div>
												</TabsContent>
												<TabsContent value="trial">
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
														<div className="space-y-2">
															<Label>Trial Price (INR)</Label>
															<Input
																type="number"
																min={0}
																value={String(pricing.trial?.price ?? 0)}
																onChange={(e) => setPricing((p) => ({ ...p, trial: { price: safeNumber(e.target.value), servings: 1 } }))}
															/>
														</div>
														<div className="space-y-2">
															<Label>Trial Servings</Label>
															<Input type="number" value="1" disabled />
														</div>
													</div>
													<div className="mt-3 space-y-2">
														<Label>Trial Badge Text (optional)</Label>
														<Input value={String(createDraft.trialBadgeText || '')} onChange={(e) => setCreateDraft((d) => ({ ...d, trialBadgeText: e.target.value }))} placeholder="e.g. Limited trial" />
													</div>
												</TabsContent>
											</Tabs>
										</div>
									);
								})()}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Protein per meal (g) - Default</Label>
									<Input
										type="number"
										value={String(createDraft.proteinPerMeal ?? 0)}
										onChange={(e) => setCreateDraft((d) => ({ ...d, proteinPerMeal: Math.max(0, safeNumber(e.target.value)) }))}
										min={0}
									/>
									<div className="text-xs text-muted-foreground">Fallback when with/without grams are not set.</div>
								</div>
								<div className="space-y-2">
									<Label>Calories range</Label>
									<Input value={String(createDraft.caloriesRange || '')} onChange={(e) => setCreateDraft((d) => ({ ...d, caloriesRange: e.target.value }))} placeholder="e.g. 450-550" />
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Total Quantity</Label>
									<Input
										type="number"
										min={0}
										value={String((createDraft as unknown as { totalQuantity?: number }).totalQuantity ?? '')}
										onChange={(e) => {
											const raw = e.target.value;
											setCreateDraft((d) => ({
												...d,
												totalQuantity: raw === '' ? undefined : Math.max(0, safeNumber(raw)),
											}));
										}}
										placeholder="optional"
									/>
								</div>
								<div className="space-y-2">
									<Label>Quantity Unit</Label>
									<Select
										value={String((createDraft as unknown as { totalQuantityUnit?: IncludedItemUnit }).totalQuantityUnit || 'g')}
										onValueChange={(v) => setCreateDraft((d) => ({ ...d, totalQuantityUnit: v as IncludedItemUnit }))}
									>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											{MEAL_TOTAL_QUANTITY_UNITS.map((u) => (
												<SelectItem key={u} value={u}>{u}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{getMode(createDraft) !== 'default' ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Protein per meal (g) - With Protein</Label>
										<Input
											type="number"
											min={0}
											value={String((createDraft as unknown as { proteinPerMealWith?: number }).proteinPerMealWith ?? '')}
											onChange={(e) => {
												const raw = e.target.value;
												setCreateDraft((d) => ({
													...d,
													proteinPerMealWith: raw === '' ? undefined : Math.max(0, safeNumber(raw)),
												}));
											}}
											placeholder="optional"
										/>
									</div>
									<div className="space-y-2">
										<Label>Protein per meal (g) - Without Protein</Label>
										<Input
											type="number"
											min={0}
											value={String((createDraft as unknown as { proteinPerMealWithout?: number }).proteinPerMealWithout ?? '')}
											onChange={(e) => {
												const raw = e.target.value;
												setCreateDraft((d) => ({
													...d,
													proteinPerMealWithout: raw === '' ? undefined : Math.max(0, safeNumber(raw)),
												}));
											}}
											placeholder="optional"
										/>
									</div>
								</div>
							) : null}

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Display Order</Label>
									<Input type="number" min={0} value={String(createDraft.displayOrder ?? 0)} onChange={(e) => setCreateDraft((d) => ({ ...d, displayOrder: clampInt(safeNumber(e.target.value), 0) }))} />
								</div>
								<div className="space-y-2">
									<Label>Tags (comma-separated)</Label>
									<Input value={createTags} onChange={(e) => setCreateTags(e.target.value)} placeholder="high-protein, keto, low-carb" />
								</div>
							</div>

							<div className="space-y-2">
								<Label>Options</Label>
								<div className="flex flex-wrap items-center gap-4">
									<div className="flex items-center gap-2">
										<Switch checked={Boolean(createDraft.hasWithProteinOption)} onCheckedChange={(checked) => setCreateDraft((d) => ({ ...d, hasWithProteinOption: checked }))} />
										<span className="text-sm">With protein</span>
									</div>
									<div className="flex items-center gap-2">
										<Switch checked={Boolean(createDraft.hasWithoutProteinOption)} onCheckedChange={(checked) => setCreateDraft((d) => ({ ...d, hasWithoutProteinOption: checked }))} />
										<span className="text-sm">Without protein</span>
									</div>
								</div>
							</div>

							{includedItemsCatalog.length > 0 ? (
								<div className="space-y-2">
									<Label>Included Items (Dynamic)</Label>
									<div className="space-y-2 rounded-lg border p-3">
										{includedItemsCatalog.map((item) => {
											const assignment = getAssignments(createDraft).find((a) => a.itemId === item.id);
											const checked = Boolean(assignment);
											return (
												<div key={item.id} className="rounded-md border p-3">
													<div className="flex items-center justify-between gap-3">
														<label className="flex items-center gap-2 text-sm font-medium">
															<Checkbox
																checked={checked}
																onCheckedChange={(v) => toggleAssignment(setCreateDraft, item, Boolean(v))}
															/>
															<span>{item.name}</span>
													</label>
													<div className="text-xs text-muted-foreground">{item.defaultUnit}</div>
												</div>

												{checked && assignment ? (
													<div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
														<div className="space-y-1">
															<Label className="text-xs">Quantity</Label>
															<Input
																type="number"
																min={0}
																value={String(assignment.quantity ?? 0)}
																onChange={(e) =>
																patchAssignment(setCreateDraft, item.id, { quantity: Number(e.target.value) || 0 })
															}
															/>
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Unit</Label>
															<Select
																value={assignment.unit}
																onValueChange={(v) => patchAssignment(setCreateDraft, item.id, { unit: v as IncludedItemUnit })}
															>
																<SelectTrigger><SelectValue /></SelectTrigger>
																<SelectContent>
																	{INCLUDED_ITEM_UNITS.map((u) => (
																		<SelectItem key={u} value={u}>{u}</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Visibility</Label>
															<Select
																value={assignment.visibility}
																onValueChange={(v) => patchAssignment(setCreateDraft, item.id, { visibility: v as IncludedItemVisibility })}
															>
																<SelectTrigger><SelectValue /></SelectTrigger>
																<SelectContent>
																	{INCLUDED_ITEM_VISIBILITY.map((g) => (
																		<SelectItem key={g} value={g}>{g}</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>
													</div>
												) : null}
											</div>
										);
									})}
									</div>
								</div>
							) : null}

							<div className="space-y-2">
								<Label>Visibility</Label>
								<div className="flex flex-wrap items-center gap-4">
									<div className="flex items-center gap-2">
										<Switch checked={Boolean(createDraft.isActive)} onCheckedChange={(checked) => setCreateDraft((d) => ({ ...d, isActive: checked }))} />
										<span className="text-sm">Active</span>
									</div>
									<div className="flex items-center gap-2">
										<Switch checked={Boolean(createDraft.isFeatured)} onCheckedChange={(checked) => setCreateDraft((d) => ({ ...d, isFeatured: checked }))} />
										<span className="text-sm">Featured</span>
									</div>
									<div className="flex items-center gap-2">
										<Switch
											checked={Boolean(createDraft.isTrialEligible)}
											onCheckedChange={(checked) => {
												setCreateDraft((d) => {
													const nextPricing = d.pricing || DEFAULT_PRICING;
													return {
														...d,
														isTrialEligible: checked,
														pricing: checked ? { ...nextPricing, trial: nextPricing.trial || { price: 0, servings: 1 } } : { ...nextPricing, trial: undefined },
														trialBadgeText: checked ? d.trialBadgeText : '',
													};
												});
												if (checked) setCreatePricingTab('trial');
											}}
										/>
										<span className="text-sm">Trial eligible</span>
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base flex items-center gap-2">
										<ImagePlus className="h-4 w-4" />
										Image
									</CardTitle>
								</CardHeader>
								<CardContent className="text-sm text-muted-foreground">
									Image uploads happen after creation. Create the meal first, then upload an image from the edit screen.
								</CardContent>
							</Card>
						</div>
						</div>
					</ScrollArea>

					<DialogFooter className="pt-2">
						<Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
						<Button onClick={handleCreate} disabled={creating || !canSubmitDraft(createDraft)}>
							{creating ? 'Creating…' : 'Create Meal'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={editOpen} onOpenChange={(open) => {
				setEditOpen(open);
				if (!open) {
					setEditItem(null);
					setUploadFile(null);
					setUploadPct(undefined);
				}
			}}>
				<DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
					<DialogHeader>
						<DialogTitle>Edit Meal</DialogTitle>
						<DialogDescription>Update details and upload a new image.</DialogDescription>
					</DialogHeader>

					<ScrollArea className="max-h-[70vh] pr-4">
						{!editItem ? (
							<div className="py-8"><Skeleton className="h-32 w-full" /></div>
						) : (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<div className="space-y-4">
								<div className="space-y-2">
									<Label>Name</Label>
									<Input
										value={String(editDraft.name || '')}
										onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
										placeholder="e.g. High Protein Pack"
									/>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Meal Type</Label>
											<Select
												disabled={!mealTypeOptions.length}
												value={String(editDraft.mealType || '')}
											onValueChange={(v) =>
												setEditDraft((d) => ({
													...d,
													mealType: v as MealType,
													mealTypeId: mealTypeIdBySlug(String(v)) || (d as unknown as { mealTypeId?: string }).mealTypeId,
											}))
										}
										>
											<SelectTrigger>
												<SelectValue placeholder={mealTypeOptions.length ? 'Meal type' : 'Create a meal type first'} />
											</SelectTrigger>
											<SelectContent>
												{mealTypeOptions.map((t) => (
													<SelectItem key={t.slug} value={t.slug}>
														{t.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>Slug (optional)</Label>
										<Input
											value={String(editDraft.slug || '')}
											onChange={(e) => setEditDraft((d) => ({ ...d, slug: e.target.value }))}
											placeholder="auto-generated if empty"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label>Short Description</Label>
									<Textarea
										value={String(editDraft.shortDescription || '')}
										onChange={(e) => setEditDraft((d) => ({ ...d, shortDescription: e.target.value }))}
										rows={3}
									/>
								</div>

								<div className="space-y-2">
									<Label>Detailed Description (optional)</Label>
									<Textarea
										value={String(editDraft.detailedDescription || '')}
										onChange={(e) => setEditDraft((d) => ({ ...d, detailedDescription: e.target.value }))}
										rows={5}
									/>
								</div>

								<div className="space-y-2">
									<Label>Protein Pricing Mode</Label>
									<Select
										value={String(getMode(editDraft))}
										onValueChange={(v) => {
											const mode = v as ProteinPricingMode;
											setEditDraft((d) => {
												const next: Partial<AdminMeal> = { ...d, proteinPricingMode: mode };
												if (mode === 'with-only') {
													next.hasWithProteinOption = true;
													next.hasWithoutProteinOption = false;
												}
												if (mode === 'without-only') {
													next.hasWithProteinOption = false;
													next.hasWithoutProteinOption = true;
												}
												if (mode === 'both') {
													next.hasWithProteinOption = true;
													next.hasWithoutProteinOption = true;
												}
												if (mode !== 'default') {
													const pp = ensureProteinPricing(next);
													(next as unknown as { proteinPricing?: Meal['proteinPricing'] }).proteinPricing = {
														...pp,
														withProtein: pp.withProtein || { ...DEFAULT_PRICING },
														withoutProtein: pp.withoutProtein || { ...DEFAULT_PRICING },
													};
												}
												return next;
											});
											if (mode === 'both') setEditProteinTier('with');
										}}
									>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectItem value="default">Default</SelectItem>
											<SelectItem value="with-only">With-only</SelectItem>
											<SelectItem value="without-only">Without-only</SelectItem>
											<SelectItem value="both">Both</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label>Pricing</Label>
									{(() => {
										const mode = getMode(editDraft);
										const picked = pickPricingForMode(editDraft, editProteinTier);
										const pricing = picked.pricing;
										const setPricing = (patch: (p: MealPricing) => MealPricing) => {
											setEditDraft((d) => {
												if (mode === 'default') {
													return { ...d, pricing: patch((d.pricing as MealPricing | undefined) || DEFAULT_PRICING) };
												}
												const pp = ensureProteinPricing(d);
												if (picked.root === 'proteinPricing.withProtein') {
													return { ...d, proteinPricing: { ...pp, withProtein: patch((pp.withProtein as MealPricing | undefined) || DEFAULT_PRICING) } };
												}
												return { ...d, proteinPricing: { ...pp, withoutProtein: patch((pp.withoutProtein as MealPricing | undefined) || DEFAULT_PRICING) } };
											});
										};

										return (
											<div className="space-y-3">
												{mode === 'both' && (
													<Tabs value={editProteinTier} onValueChange={(v) => setEditProteinTier(v as typeof editProteinTier)}>
														<TabsList className="w-full justify-start">
															<TabsTrigger value="with">With Protein</TabsTrigger>
															<TabsTrigger value="without">Without Protein</TabsTrigger>
														</TabsList>
													</Tabs>
												)}

												<Tabs value={editPricingTab} onValueChange={(v) => setEditPricingTab(v as typeof editPricingTab)}>
													<TabsList className="w-full justify-start">
														<TabsTrigger value="weekly">Weekly</TabsTrigger>
														<TabsTrigger value="monthly">Monthly</TabsTrigger>
														<TabsTrigger value="trial" disabled={!editDraft.isTrialEligible}>Trial</TabsTrigger>
													</TabsList>
													<TabsContent value="weekly">
														<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
															<div className="space-y-2">
																<Label>Weekly Price (INR)</Label>
																<Input
																	type="number"
																	min={0}
																	value={String(pricing.weekly?.price ?? 0)}
																	onChange={(e) => setPricing((p) => ({ ...p, weekly: { ...p.weekly, price: safeNumber(e.target.value) } }))}
																/>
															</div>
															<div className="space-y-2">
																<Label>Weekly Servings</Label>
																<Input
																	type="number"
																	min={1}
																	value={String(pricing.weekly?.servings ?? 5)}
																	onChange={(e) => setPricing((p) => ({ ...p, weekly: { ...p.weekly, servings: clampInt(safeNumber(e.target.value), 1) } }))}
																/>
															</div>
														</div>
													</TabsContent>
													<TabsContent value="monthly">
														<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
															<div className="space-y-2">
																<Label>Monthly Price (INR)</Label>
																<Input
																	type="number"
																	min={0}
																	value={String(pricing.monthly?.price ?? 0)}
																	onChange={(e) => setPricing((p) => ({ ...p, monthly: { ...p.monthly, price: safeNumber(e.target.value) } }))}
																/>
															</div>
															<div className="space-y-2">
																<Label>Monthly Servings</Label>
																<Input
																	type="number"
																	min={1}
																	value={String(pricing.monthly?.servings ?? 20)}
																	onChange={(e) => setPricing((p) => ({ ...p, monthly: { ...p.monthly, servings: clampInt(safeNumber(e.target.value), 1) } }))}
																/>
															</div>
														</div>
													</TabsContent>
													<TabsContent value="trial">
														<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
															<div className="space-y-2">
																<Label>Trial Price (INR)</Label>
																<Input
																	type="number"
																	min={0}
																	value={String(pricing.trial?.price ?? 0)}
																	onChange={(e) => setPricing((p) => ({ ...p, trial: { price: safeNumber(e.target.value), servings: 1 } }))}
																/>
															</div>
															<div className="space-y-2">
																<Label>Trial Servings</Label>
																<Input type="number" value="1" disabled />
															</div>
														</div>
														<div className="mt-3 space-y-2">
															<Label>Trial Badge Text (optional)</Label>
															<Input
																value={String(editDraft.trialBadgeText || '')}
																onChange={(e) => setEditDraft((d) => ({ ...d, trialBadgeText: e.target.value }))}
																placeholder="e.g. Limited trial"
															/>
														</div>
													</TabsContent>
												</Tabs>
											</div>
										);
									})()}
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Protein per meal (g) - Default</Label>
										<Input
											type="number"
											value={String(editDraft.proteinPerMeal ?? 0)}
											onChange={(e) => setEditDraft((d) => ({ ...d, proteinPerMeal: Math.max(0, safeNumber(e.target.value)) }))}
											min={0}
										/>
										<div className="text-xs text-muted-foreground">Fallback when with/without grams are not set.</div>
									</div>
									<div className="space-y-2">
										<Label>Calories range</Label>
										<Input
											value={String(editDraft.caloriesRange || '')}
											onChange={(e) => setEditDraft((d) => ({ ...d, caloriesRange: e.target.value }))}
											placeholder="e.g. 450-550"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Total Quantity</Label>
										<Input
											type="number"
											min={0}
											value={String((editDraft as unknown as { totalQuantity?: number }).totalQuantity ?? '')}
											onChange={(e) => {
												const raw = e.target.value;
												setEditDraft((d) => ({
													...d,
													totalQuantity: raw === '' ? undefined : Math.max(0, safeNumber(raw)),
												}));
											}}
											placeholder="optional"
										/>
									</div>
									<div className="space-y-2">
										<Label>Quantity Unit</Label>
										<Select
											value={String((editDraft as unknown as { totalQuantityUnit?: IncludedItemUnit }).totalQuantityUnit || 'g')}
											onValueChange={(v) => setEditDraft((d) => ({ ...d, totalQuantityUnit: v as IncludedItemUnit }))}
										>
											<SelectTrigger><SelectValue /></SelectTrigger>
											<SelectContent>
												{MEAL_TOTAL_QUANTITY_UNITS.map((u) => (
													<SelectItem key={u} value={u}>{u}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

								{getMode(editDraft) !== 'default' ? (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label>Protein per meal (g) - With Protein</Label>
											<Input
												type="number"
												min={0}
												value={String((editDraft as unknown as { proteinPerMealWith?: number }).proteinPerMealWith ?? '')}
												onChange={(e) => {
													const raw = e.target.value;
													setEditDraft((d) => ({
														...d,
														proteinPerMealWith: raw === '' ? undefined : Math.max(0, safeNumber(raw)),
													}));
												}}
												placeholder="optional"
											/>
										</div>
										<div className="space-y-2">
											<Label>Protein per meal (g) - Without Protein</Label>
											<Input
												type="number"
												min={0}
												value={String((editDraft as unknown as { proteinPerMealWithout?: number }).proteinPerMealWithout ?? '')}
												onChange={(e) => {
													const raw = e.target.value;
													setEditDraft((d) => ({
														...d,
														proteinPerMealWithout: raw === '' ? undefined : Math.max(0, safeNumber(raw)),
													}));
												}}
												placeholder="optional"
											/>
										</div>
									</div>
								) : null}

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Display Order</Label>
										<Input
											type="number"
											min={0}
											value={String(editDraft.displayOrder ?? 0)}
											onChange={(e) => setEditDraft((d) => ({ ...d, displayOrder: clampInt(safeNumber(e.target.value), 0) }))}
										/>
									</div>
									<div className="space-y-2">
										<Label>Tags (comma-separated)</Label>
										<Input value={editTags} onChange={(e) => setEditTags(e.target.value)} />
									</div>
								</div>

								<div className="space-y-2">
									<Label>Options</Label>
									<div className="flex flex-wrap items-center gap-4">
										<div className="flex items-center gap-2">
											<Switch
												checked={Boolean(editDraft.hasWithProteinOption)}
												onCheckedChange={(checked) => setEditDraft((d) => ({ ...d, hasWithProteinOption: checked }))}
											/>
											<span className="text-sm">With protein</span>
										</div>
										<div className="flex items-center gap-2">
											<Switch
												checked={Boolean(editDraft.hasWithoutProteinOption)}
												onCheckedChange={(checked) => setEditDraft((d) => ({ ...d, hasWithoutProteinOption: checked }))}
											/>
											<span className="text-sm">Without protein</span>
										</div>
									</div>
								</div>

								{includedItemsCatalog.length > 0 ? (
									<div className="space-y-2">
										<Label>Included Items (Dynamic)</Label>
										<div className="space-y-2 rounded-lg border p-3">
											{includedItemsCatalog.map((item) => {
												const assignment = getAssignments(editDraft).find((a) => a.itemId === item.id);
												const checked = Boolean(assignment);
												return (
													<div key={item.id} className="rounded-md border p-3">
														<div className="flex items-center justify-between gap-3">
															<label className="flex items-center gap-2 text-sm font-medium">
																<Checkbox
																	checked={checked}
																	onCheckedChange={(v) => toggleAssignment(setEditDraft, item, Boolean(v))}
																/>
																<span>{item.name}</span>
														</label>
														<div className="text-xs text-muted-foreground">{item.defaultUnit}</div>
													</div>

													{checked && assignment ? (
													<div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
														<div className="space-y-1">
															<Label className="text-xs">Quantity</Label>
															<Input
																type="number"
																min={0}
																value={String(assignment.quantity ?? 0)}
																onChange={(e) =>
																patchAssignment(setEditDraft, item.id, { quantity: Number(e.target.value) || 0 })
															}
															/>
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Unit</Label>
															<Select
																value={assignment.unit}
																onValueChange={(v) => patchAssignment(setEditDraft, item.id, { unit: v as IncludedItemUnit })}
															>
																<SelectTrigger><SelectValue /></SelectTrigger>
																<SelectContent>
																	{INCLUDED_ITEM_UNITS.map((u) => (
																		<SelectItem key={u} value={u}>{u}</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Visibility</Label>
															<Select
																value={assignment.visibility}
																onValueChange={(v) => patchAssignment(setEditDraft, item.id, { visibility: v as IncludedItemVisibility })}
															>
																<SelectTrigger><SelectValue /></SelectTrigger>
																<SelectContent>
																	{INCLUDED_ITEM_VISIBILITY.map((g) => (
																		<SelectItem key={g} value={g}>{g}</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>
													</div>
												) : null}
											</div>
										);
									})}
									</div>
								</div>
							) : null}

								<div className="space-y-2">
									<Label>Visibility</Label>
									<div className="flex flex-wrap items-center gap-4">
										<div className="flex items-center gap-2">
											<Switch checked={Boolean(editDraft.isActive)} onCheckedChange={(v) => setEditDraft((d) => ({ ...d, isActive: v }))} />
											<span className="text-sm">Active</span>
										</div>
										<div className="flex items-center gap-2">
											<Switch checked={Boolean(editDraft.isFeatured)} onCheckedChange={(v) => setEditDraft((d) => ({ ...d, isFeatured: v }))} />
											<span className="text-sm">Featured</span>
										</div>
										<div className="flex items-center gap-2">
											<Switch
												checked={Boolean(editDraft.isTrialEligible)}
												onCheckedChange={(checked) => {
													setEditDraft((d) => {
														const nextPricing = d.pricing || DEFAULT_PRICING;
														return {
															...d,
															isTrialEligible: checked,
															pricing: checked ? { ...nextPricing, trial: nextPricing.trial || { price: 0, servings: 1 } } : { ...nextPricing, trial: undefined },
															trialBadgeText: checked ? d.trialBadgeText : '',
														};
													});
													if (checked) setEditPricingTab('trial');
													else setEditPricingTab('weekly');
												}}
											/>
											<span className="text-sm">Trial eligible</span>
										</div>
									</div>
								</div>
							</div>

							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base flex items-center gap-2">
										<ImagePlus className="h-4 w-4" />
										Images
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-5">
									{(() => {
										const draftImages = (editDraft as unknown as { images?: AdminMeal['images']; image?: AdminMeal['image'] }).images;
										const draftImage = (editDraft as unknown as { images?: AdminMeal['images']; image?: AdminMeal['image'] }).image;
										const list = Array.isArray(draftImages) && draftImages.length ? draftImages : draftImage ? [draftImage] : [];
										return (
											<div className="space-y-2">
												<input
													ref={replacePickerRef}
													type="file"
													accept="image/jpeg,image/png,image/webp"
													className="hidden"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) void handleReplacePicked(file);
														e.target.value = '';
												}}
												/>

											<div className="text-sm font-medium">Gallery (first image shows on cards)</div>
											{list.length ? (
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
													{list.map((img, idx) => (
														<div key={`${img.publicId || img.url}-${idx}`} className="rounded-xl overflow-hidden border bg-muted">
															<div className="relative">
																<img src={img.url} alt={img.alt || editItem.name} className="w-full aspect-[16/9] object-cover" loading="lazy" />
																<div className="absolute bottom-2 left-2 flex flex-wrap gap-2">
																	{idx !== 0 ? (
																		<Button size="sm" variant="secondary" disabled={uploading || saving} onClick={() => void handleMakePrimary(idx)}>
																			Make primary
																		</Button>
																	) : (
																		<Badge variant="secondary">Primary</Badge>
																	)}
																	<Button size="sm" variant="outline" disabled={uploading || saving} onClick={() => triggerReplacePicker(idx)}>
																		Replace
																	</Button>
																	<Button size="sm" variant="destructive" disabled={uploading || saving} onClick={() => void handleDeleteImageAtIndex(idx)}>
																		Delete
																	</Button>
															</div>
														</div>
													</div>
													))}
												</div>
											) : (
												<div className="w-full aspect-[16/9] flex items-center justify-center text-muted-foreground rounded-xl border bg-muted">
													No images
												</div>
											)}

											<div className="border-t pt-4 space-y-2">
												<div className="text-sm font-medium">Replace primary image</div>
												<ImageDropzone value={uploadFile} onChange={setUploadFile} disabled={uploading || saving} progressPct={uploadPct} />
												<div className="space-y-2">
													<Label>Image Alt Text (optional)</Label>
													<Input value={uploadAlt} onChange={(e) => setUploadAlt(e.target.value)} placeholder="e.g. Chicken bowl with veggies" />
												</div>
												<Button variant="outline" disabled={!uploadFile || uploading || saving} onClick={handleUpload}>
													{uploading ? 'Uploading…' : 'Update Primary'}
												</Button>
											</div>

											<div className="border-t pt-4 space-y-3">
												<div className="text-sm font-medium">Add new images</div>
												<Input
													type="file"
													multiple
													accept="image/jpeg,image/png,image/webp"
													disabled={uploading || saving}
													onChange={(e) => setAddFiles(Array.from(e.target.files || []))}
												/>
												<div className="text-xs text-muted-foreground">Selected: {addFiles.length || 0}</div>
												<Button variant="outline" disabled={!addFiles.length || uploading || saving} onClick={handleAddImages}>
													{uploading ? 'Uploading…' : 'Add Images'}
												</Button>
											</div>
										</div>
										);
									})()}
								</CardContent>
							</Card>
						</div>
						)}
					</ScrollArea>

					<DialogFooter className="pt-2">
						<Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving || uploading}>Close</Button>
						<Button onClick={handleSave} disabled={!editItem || saving || uploading || !canSubmitDraft(editDraft)}>
							{saving ? 'Saving…' : 'Save Changes'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default AdminMeals;
