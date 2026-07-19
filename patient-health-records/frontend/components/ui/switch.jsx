import * as React from 'react';
import { cn } from '@/lib/utils';

export const Switch = React.forwardRef(({ checked, className, ...props }, ref) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    className={cn(
      'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'bg-primary' : 'bg-input',
      className
    )}
    ref={ref}
    {...props}
  >
    <span
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-background shadow transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0'
      )}
    />
  </button>
));

Switch.displayName = 'Switch';
