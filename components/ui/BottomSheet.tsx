/**
 * BottomSheet — the app's one bottom-sheet shell (team quick menu, Your teams
 * picker, …): dimmed backdrop + sheet that slides up from the bottom.
 *
 * Close it three ways: tap the backdrop, a button inside, or SWIPE IT DOWN.
 * Drag follows the finger (down only); let go past 25% of the sheet's height
 * or with a quick flick → closes, otherwise springs back.
 *
 *   grab="sheet"  → the whole sheet drags (short sheets with no scrolling)
 *   grab="header" → only the grabber + `header` drag, so a scrolling body keeps
 *                   native scroll (iOS sheets work the same way)
 */

'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  /** Backdrop button's accessible name. */
  closeLabel?: string;
  grab?: 'sheet' | 'header';
  /** Drag zone under the grabber (grab="header"). */
  header?: ReactNode;
  children: ReactNode;
  /** Extra classes / styles for the sheet (layout, padding, maxHeight). */
  className?: string;
  style?: CSSProperties;
}

/** Released past this share of the sheet's height → close. */
const CLOSE_FRACTION = 0.25;
/** …or flicked down at least this fast (px/s). */
const CLOSE_VELOCITY = 500;

/** Swipe-down release → close? (pure, unit-tested) */
export function shouldCloseSheet(dragY: number, velocityY: number, sheetHeight: number): boolean {
  return dragY > sheetHeight * CLOSE_FRACTION || velocityY > CLOSE_VELOCITY;
}

export default function BottomSheet({
  open, onClose, label, closeLabel = 'Close', grab = 'sheet', header, children, className, style,
}: BottomSheetProps) {
  const controls = useDragControls();
  const sheetRef = useRef<HTMLElement>(null);
  const byHeader = grab === 'header';

  const onDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const h = sheetRef.current?.offsetHeight ?? 400;
    if (shouldCloseSheet(info.offset.y, info.velocity.y, h)) onClose();
  };

  const grabber = (
    <div className="mx-auto h-1 w-9 shrink-0 rounded-full" style={{ background: 'var(--frame-mid)' }} aria-hidden />
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="backdrop"
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'color-mix(in srgb, var(--bg-deep) 70%, transparent)' }}
          />
          <motion.section
            key="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y"
            dragListener={!byHeader}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            dragMomentum={false}
            onDragEnd={onDragEnd}
            className={`fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[600px] flex-col ${className ?? ''}`}
            style={{
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              background: 'var(--card-deep-mid)',
              borderTop: '1px solid var(--glass-edge)',
              boxShadow: 'var(--shadow-pop)',
              ...style,
            }}
          >
            {byHeader ? (
              // touch-action none: the browser hands this zone's vertical swipes to the drag.
              <div onPointerDown={(e) => controls.start(e)} className="shrink-0 pt-2.5" style={{ touchAction: 'none' }}>
                {grabber}
                {header}
              </div>
            ) : (
              grabber
            )}
            {children}
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
