import { cn } from '@app/lib/utils';

/** Short brand-gradient dash used under page titles; purely decorative. */
export function AccentRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'h-0.5 w-12 rounded-full bg-linear-to-r from-cyan-400 via-blue-500 to-violet-500',
        className,
      )}
    />
  );
}
