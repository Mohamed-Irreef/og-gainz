import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const validateImageFile = (file: File) => {
	if (!ALLOWED_TYPES.has(file.type)) return 'Unsupported image type. Use JPG, PNG, or WEBP.';
	if (file.size > MAX_IMAGE_SIZE_BYTES) return 'Image too large. Max size is 5MB.';
	return null;
};

type Props = {
	value: File | null;
	onChange: (file: File | null) => void;
	disabled?: boolean;
	progressPct?: number;
	className?: string;
};

export function ImageDropzone({ value, onChange, disabled, progressPct, className }: Props) {
	const [isDragging, setIsDragging] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!value) {
			setPreviewUrl(null);
			setError(null);
			return;
		}
		const url = URL.createObjectURL(value);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [value]);

	const accept = useMemo(() => Array.from(ALLOWED_TYPES).join(','), []);

	const setFile = useCallback(
		(file: File | null) => {
			if (!file) {
				setError(null);
				onChange(null);
				return;
			}

			const message = validateImageFile(file);
			if (message) {
				setError(message);
				onChange(null);
				return;
			}

			setError(null);
			onChange(file);
		},
		[onChange]
	);

	return (
		<div className={cn('space-y-3', className)}>
			<div
				className={cn(
					'relative rounded-xl border border-dashed p-4 transition-colors',
					isDragging ? 'border-oz-secondary bg-oz-secondary/5' : 'border-oz-neutral bg-white',
					disabled && 'opacity-60 pointer-events-none'
				)}
				onDragEnter={(e) => {
					e.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={(e) => {
					e.preventDefault();
					setIsDragging(false);
				}}
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragging(true);
				}}
				onDrop={(e) => {
					e.preventDefault();
					setIsDragging(false);
					const file = e.dataTransfer.files?.[0] || null;
					setFile(file);
				}}
			>
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 rounded-lg bg-oz-neutral/40 flex items-center justify-center">
						{previewUrl ? <ImageIcon className="h-5 w-5 text-oz-primary" /> : <UploadCloud className="h-5 w-5 text-oz-primary" />}
					</div>
					<div className="flex-1">
						<div className="text-sm font-medium text-oz-primary">Drag & drop an image</div>
						<div className="text-xs text-muted-foreground">JPG / PNG / WEBP · max 5MB</div>
					</div>
					<label className="text-sm font-medium text-oz-secondary cursor-pointer">
						<input
							type="file"
							accept={accept}
							disabled={disabled}
							className="hidden"
							onChange={(e) => setFile(e.target.files?.[0] || null)}
						/>
						Browse
					</label>
				</div>

				{previewUrl && (
					<div className="mt-4 overflow-hidden rounded-lg border border-oz-neutral">
						<img src={previewUrl} alt="Preview" className="w-full aspect-[16/9] object-cover" />
					</div>
				)}
			</div>

			{typeof progressPct === 'number' && (
				<div className="space-y-1">
					<div className="text-xs text-muted-foreground">Uploading… {progressPct}%</div>
					<Progress value={progressPct} />
				</div>
			)}

			{error && <div className="text-xs text-destructive">{error}</div>}
		</div>
	);
}
