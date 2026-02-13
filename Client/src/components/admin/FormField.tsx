import type { ReactNode } from 'react';
import { isValidElement, cloneElement } from 'react';

import { cn } from '@/lib/utils';
import { ADMIN_INPUT_CLASS } from './AdminFormLayout';

type FormFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  controlClassName?: string;
  applyInputStyles?: boolean;
  children: ReactNode;
};

export default function FormField({
  label,
  required,
  error,
  hint,
  className,
  controlClassName,
  applyInputStyles = true,
  children,
}: FormFieldProps) {
  const content = isValidElement(children)
    ? cloneElement(children, {
        className: cn(
          applyInputStyles ? ADMIN_INPUT_CLASS : null,
          (children.props as { className?: string }).className,
          controlClassName
        ),
      })
    : children;

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      {content}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
