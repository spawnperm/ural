/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Accessible modal dialog.
 *
 * ## What the previous implementation was missing
 *
 * The commit panel rendered a `div` with `role="dialog"` and `aria-modal="true"`,
 * which announces a dialog but does not behave like one. Three things were absent,
 * and each is a real barrier:
 *
 * 1. **Escape did not close it.** A keyboard user had to Tab to the close button.
 * 2. **Focus stayed on the page behind.** Tab walked into the navigation, so the
 *    "modal" was a visual illusion — the user could interact with two layers and
 *    lose track of which one they were in.
 * 3. **Focus was not returned.** After closing, the user landed at the top of the
 *    document instead of the button they came from.
 *
 * ## Why the implementation is not a library
 *
 * `focus-trap` or `@radix-ui/react-dialog` would solve this, but a dialog is about
 * forty lines: remember the opener, move focus in, keep Tab inside, restore on
 * close. The dependency would be larger than the code it replaces and would add a
 * second styling system to a Tailwind-only project.
 *
 * Rolled-scroll on the body is locked while open so a wheel or trackpad gesture
 * does not move the page underneath.
 */

import { useEffect, useRef, type ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name. Required: a dialog without one is announced as "диалог". */
  label: string;
  children: ReactNode;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

export function Modal({ open, onClose, label, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Remember what had focus so it can be restored — otherwise closing drops the
    // user back at the top of the document.
    openerRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (panel) {
      const focusable = getFocusable(panel);
      // Focus the first control, or the panel itself when it has none.
      (focusable[0] ?? panel).focus();
    }

    // Lock background scrolling while the dialog is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      // Cycle focus inside the panel: Tab from the last control goes to the first.
      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      // Restore focus to the control that opened the dialog.
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      // A click on the backdrop closes; a click inside the panel must not, which
      // is why the panel stops propagation rather than the handler checking
      // `event.target === event.currentTarget`.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl focus:outline-none"
      >
        {children}
      </div>
    </div>
  );
}
