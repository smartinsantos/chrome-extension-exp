import { cn } from '@repo/ui/lib/utils';
import { CalendarClock, CircleCheck } from 'lucide-react';

const dueDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Formats a `YYYY-MM-DD` date like "Oct 10" without shifting it across time zones. */
export function formatDueDate(isoDate: string): string {
  return dueDateFormatter.format(new Date(`${isoDate}T12:00:00.000Z`));
}

interface DueDateBadgeProps {
  dueDate: string;
  isOverdue: boolean;
  isDueComplete: boolean;
}

export function DueDateBadge({ dueDate, isOverdue, isDueComplete }: DueDateBadgeProps) {
  const Icon = isDueComplete ? CircleCheck : CalendarClock;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs',
        isDueComplete && 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
        isOverdue && 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
        !isDueComplete && !isOverdue && 'text-muted-foreground',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {isOverdue ? `Overdue · ${formatDueDate(dueDate)}` : formatDueDate(dueDate)}
    </span>
  );
}
