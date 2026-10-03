import { cn } from '@repo/ui/lib/utils';

import type { LabelColor } from '../../../gql/graphql';

const LABEL_COLOR_CLASSES: Record<LabelColor, string> = {
  GRAY: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100',
  RED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  ORANGE: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  YELLOW: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',
  GREEN: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  BLUE: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  PURPLE: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
  PINK: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200',
};

export function LabelChip({
  name,
  color,
  className,
}: {
  name: string;
  color: LabelColor;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        LABEL_COLOR_CLASSES[color],
        className,
      )}
    >
      {name}
    </span>
  );
}
