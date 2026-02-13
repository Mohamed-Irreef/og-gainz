import type { ReactNode, FormEvent } from 'react';

import { cn } from '@/lib/utils';

type AdminFormLayoutProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  className?: string;
  stickyActions?: boolean;
};

export const ADMIN_FORM_GRID = 'grid grid-cols-1 md:grid-cols-2 gap-6';
export const ADMIN_INPUT_CLASS = 'h-11 rounded-xl px-4 py-2';
export const ADMIN_FORM_CONTAINER = [
  'space-y-6',
  '[&_label]:!text-xs',
  '[&_label]:!font-semibold',
  '[&_label]:!uppercase',
  '[&_label]:!tracking-wide',
  '[&_label]:!text-muted-foreground',
  '[&_input]:!h-11',
  '[&_input]:!rounded-xl',
  '[&_input]:!px-4',
  '[&_input]:!py-2',
  '[&_textarea]:!rounded-xl',
  '[&_textarea]:!px-4',
  '[&_textarea]:!py-2',
  '[&_[data-radix-select-trigger]]:!h-11',
  '[&_[data-radix-select-trigger]]:!rounded-xl',
  '[&_[data-radix-select-trigger]]:!px-4',
  '[&_[data-radix-select-trigger]]:!py-2',
].join(' ');

export default function AdminFormLayout({
  title,
  description,
  children,
  actions,
  onSubmit,
  className,
  stickyActions,
}: AdminFormLayoutProps) {
  return (
    <form onSubmit={onSubmit} className={cn('space-y-6', className)}>
      {title ? (
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}

      {children}

      {actions ? (
        <div
          className={cn(
            'flex items-center justify-end gap-2 border-t bg-background/95 px-6 py-4',
            stickyActions ? 'sticky bottom-0' : null
          )}
        >
          {actions}
        </div>
      ) : null}
    </form>
  );
}
