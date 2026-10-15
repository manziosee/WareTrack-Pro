import toast from 'react-hot-toast';
import { Undo2, Trash2 } from 'lucide-react';

interface UndoableOptions {
  /** e.g. "Order ORD-000123 deleted" */
  message: string;
  /** Remove the item from the screen straight away. */
  apply: () => void;
  /** Put the item back if the user clicks Undo or the request fails. */
  revert: () => void;
  /** The real request; only sent once the undo window has passed. */
  commit: () => Promise<unknown>;
  delayMs?: number;
}

/**
 * Optimistic delete with an "Undo" toast instead of an "Are you sure?" dialog.
 * The request is sent only after the undo window closes.
 */
export function undoableAction({ message, apply, revert, commit, delayMs = 5000 }: UndoableOptions) {
  let undone = false;
  apply();

  const timer = window.setTimeout(async () => {
    if (undone) return;
    try {
      await commit();
    } catch (error: any) {
      revert();
      toast.error(error?.message || 'Could not complete the action. It has been restored.');
    }
  }, delayMs);

  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 rounded-xl bg-gray-900 py-2.5 pl-4 pr-2 text-sm text-white shadow-lift ring-1 ring-black/10 dark:bg-gray-100 dark:text-gray-900 ${
          t.visible ? 'animate-pop-in' : 'opacity-0'
        }`}
      >
        <Trash2 className="h-4 w-4 shrink-0 text-error-400" />
        <span>{message}</span>
        <button
          onClick={() => {
            undone = true;
            window.clearTimeout(timer);
            revert();
            toast.dismiss(t.id);
            toast.success('Restored');
          }}
          className="ml-2 inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 font-semibold text-accent-300 transition hover:bg-white/20 dark:bg-black/5 dark:text-accent-600"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </button>
      </div>
    ),
    { duration: delayMs }
  );
}
