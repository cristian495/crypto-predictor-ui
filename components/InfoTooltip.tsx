'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type InfoTooltipProps = {
  text: string;
  size?: 'sm' | 'md';
};

type TooltipPlacement = 'top' | 'bottom';

const TOOLTIP_WIDTH = 260;
const TOOLTIP_MIN_HEIGHT = 88;
const VIEWPORT_MARGIN = 8;
const OFFSET = 10;

export function InfoTooltip({ text, size = 'md' }: InfoTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    placement: 'bottom' as TooltipPlacement,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const clampedLeft = Math.max(
      VIEWPORT_MARGIN + TOOLTIP_WIDTH / 2,
      Math.min(centerX, window.innerWidth - VIEWPORT_MARGIN - TOOLTIP_WIDTH / 2),
    );

    const showOnTop =
      window.innerHeight - rect.bottom < TOOLTIP_MIN_HEIGHT && rect.top > TOOLTIP_MIN_HEIGHT;

    setPosition({
      left: clampedLeft,
      top: showOnTop ? rect.top - OFFSET : rect.bottom + OFFSET,
      placement: showOnTop ? 'top' : 'bottom',
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handleReposition = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updatePosition]);

  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5 text-[9px]' : 'h-4 w-4 text-[10px]';

  return (
    <span className="inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Más información"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        className={`inline-flex items-center justify-center rounded-full border border-slate-600 font-semibold text-slate-300 transition hover:border-slate-400 hover:text-slate-100 ${sizeClass}`}
      >
        i
      </button>

      {mounted && open
        ? createPortal(
            <span
              className={`pointer-events-none fixed z-[1000] w-[260px] -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-950/95 p-2 text-[11px] leading-relaxed text-slate-200 shadow-xl ${
                position.placement === 'top' ? '-translate-y-full' : ''
              }`}
              style={{
                left: `${position.left}px`,
                top: `${position.top}px`,
              }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
