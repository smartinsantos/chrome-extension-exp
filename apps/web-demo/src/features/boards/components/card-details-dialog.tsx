import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { Switch } from '@repo/ui/components/switch';
import { Textarea } from '@repo/ui/components/textarea';
import { cn } from '@repo/ui/lib/utils';
import { type FormEvent, useId, useState } from 'react';

import type { UpdateCardInput } from '../../../gql/graphql';
import type { BoardCardDetail, BoardLabel } from '../board-types';
import { LabelChip } from './label-chip';

interface CardDetailsDialogProps {
  card: BoardCardDetail | undefined;
  boardLabels: readonly BoardLabel[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: UpdateCardInput) => Promise<unknown>;
}

export function CardDetailsDialog({
  card,
  boardLabels,
  isSaving,
  onClose,
  onSave,
}: CardDetailsDialogProps) {
  return (
    <Dialog open={card !== undefined} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
          <DialogDescription>Changes are saved when you press Save.</DialogDescription>
        </DialogHeader>
        {card !== undefined && (
          // Keyed by card so the form starts fresh each time a different card opens.
          <CardDetailsForm
            key={card.id}
            card={card}
            boardLabels={boardLabels}
            isSaving={isSaving}
            onCancel={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CardDetailsFormProps {
  card: BoardCardDetail;
  boardLabels: readonly BoardLabel[];
  isSaving: boolean;
  onCancel: () => void;
  onSave: (input: UpdateCardInput) => Promise<unknown>;
}

function CardDetailsForm({ card, boardLabels, isSaving, onCancel, onSave }: CardDetailsFormProps) {
  const fieldIdPrefix = useId();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [dueDate, setDueDate] = useState(card.dueDate ?? '');
  const [isDueComplete, setIsDueComplete] = useState(card.isDueComplete);
  const [selectedLabelNames, setSelectedLabelNames] = useState(
    () => new Set(card.labels.map((label) => label.name)),
  );

  function toggleLabel(labelName: string) {
    setSelectedLabelNames((current) => {
      const next = new Set(current);
      if (next.has(labelName)) next.delete(labelName);
      else next.add(labelName);
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave(collectChanges());
  }

  /** Sends only what changed, so concurrent edits by an agent aren't overwritten. */
  function collectChanges(): UpdateCardInput {
    const originalLabelNames = card.labels.map((label) => label.name).toSorted();
    const labelNames = [...selectedLabelNames].toSorted();
    const labelsChanged = labelNames.join('\n') !== originalLabelNames.join('\n');
    const newDueDate = dueDate === '' ? null : dueDate;
    return {
      ...(title.trim() !== card.title && { title: title.trim() }),
      ...(description !== card.description && { description }),
      ...(newDueDate !== card.dueDate && { dueDate: newDueDate }),
      ...(isDueComplete !== card.isDueComplete && { isDueComplete }),
      ...(labelsChanged && { labelNames }),
    };
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor={`${fieldIdPrefix}-title`} className="text-sm font-medium">
          Title
        </label>
        <Input
          id={`${fieldIdPrefix}-title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${fieldIdPrefix}-description`} className="text-sm font-medium">
          Description
        </label>
        <Textarea
          id={`${fieldIdPrefix}-description`}
          value={description}
          rows={4}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <div className="space-y-1.5">
          <label htmlFor={`${fieldIdPrefix}-due-date`} className="text-sm font-medium">
            Due date
          </label>
          <Input
            id={`${fieldIdPrefix}-due-date`}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-1.5 text-sm">
          <Switch checked={isDueComplete} onCheckedChange={setIsDueComplete} />
          Done
        </label>
      </div>
      {boardLabels.length > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Labels</legend>
          <div className="flex flex-wrap gap-2">
            {boardLabels.map((label) => {
              const isSelected = selectedLabelNames.has(label.name);
              return (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleLabel(label.name)}
                  className={cn('rounded-full transition-opacity', !isSelected && 'opacity-40')}
                >
                  <LabelChip name={label.name} color={label.color} />
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || title.trim() === ''}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
