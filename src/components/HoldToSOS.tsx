import { useEffect, useRef, useState } from 'react';
import { createHold } from '@/lib/holdTimer';
import { SOS_HOLD_MS } from '@/lib/constants';

interface HoldToSOSProps {
  /** Called once, after 7 continuous seconds of holding. ISO time of completion. */
  onActivate: (triggeredAtISO: string) => void;
  disabled?: boolean;
}

const R = 88;
const CIRC = 2 * Math.PI * R;

/**
 * Big emergency button. Must be pressed and HELD for 7 seconds.
 * A click/tap, or releasing early, cancels. There is intentionally no onClick.
 */
export function HoldToSOS({ onActivate, disabled }: HoldToSOSProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [cancelledMsg, setCancelledMsg] = useState(false);
  const activateRef = useRef(onActivate);
  activateRef.current = onActivate;
  const holdRef = useRef<ReturnType<typeof createHold> | null>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hold = createHold({
      durationMs: SOS_HOLD_MS,
      onTick: (p) => setProgress(p),
      onComplete: () => {
        setHolding(false);
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          /* vibration unsupported */
        }
        activateRef.current(new Date().toISOString());
      },
      onCancel: () => {
        setHolding(false);
        setCancelledMsg(true);
        if (msgTimer.current) clearTimeout(msgTimer.current);
        msgTimer.current = setTimeout(() => setCancelledMsg(false), 2500);
      },
    });
    holdRef.current = hold;

    // Switching tabs / locking the screen must not count as "still holding".
    const onHidden = () => {
      if (document.hidden) hold.cancel();
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      hold.cancel();
      if (msgTimer.current) clearTimeout(msgTimer.current);
    };
  }, []);

  useEffect(() => {
    if (disabled) holdRef.current?.cancel();
  }, [disabled]);

  function begin() {
    if (disabled) return;
    setCancelledMsg(false);
    setHolding(true);
    holdRef.current?.start();
  }
  function end() {
    holdRef.current?.cancel();
  }

  const elapsed = progress * (SOS_HOLD_MS / 1000);
  const remaining = Math.max(0, Math.ceil(SOS_HOLD_MS / 1000 - elapsed));

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        disabled={disabled}
        aria-label="Emergency SOS. Press and hold for 7 seconds to send."
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          try {
            (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
          } catch {
            /* not supported */
          }
          begin();
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            begin();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') end();
        }}
        onBlur={end}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}
        className={`relative flex h-52 w-52 select-none items-center justify-center rounded-full outline-none transition-transform focus-visible:ring-4 focus-visible:ring-red-300 sm:h-60 sm:w-60 ${
          holding ? 'scale-95' : 'hover:scale-[1.02]'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <svg
          viewBox="0 0 200 200"
          className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
        >
          <circle cx="100" cy="100" r={R} fill="none" stroke="#fecaca" strokeWidth="10" />
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke="#7f1d1d"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
          />
        </svg>
        <span
          className={`pointer-events-none flex h-[78%] w-[78%] flex-col items-center justify-center rounded-full bg-gradient-to-b from-red-500 to-red-700 text-white shadow-xl ${
            holding ? '' : 'animate-pulse'
          }`}
        >
          {holding ? (
            <>
              <span className="text-6xl font-extrabold leading-none tabular-nums">{remaining}</span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wider">Keep holding</span>
            </>
          ) : (
            <>
              <span className="text-3xl">🚨</span>
              <span className="mt-1 text-lg font-extrabold leading-tight">EMERGENCY SOS</span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-red-100">
                Hold for 7 seconds
              </span>
            </>
          )}
        </span>
      </button>

      <div className="mt-3 h-5 text-center text-sm" aria-live="polite">
        {holding ? (
          <span className="font-semibold text-red-700">
            Release to cancel · SOS sends in {remaining}s
          </span>
        ) : cancelledMsg ? (
          <span className="font-semibold text-slate-600">
            Released early — SOS cancelled. Nothing was sent.
          </span>
        ) : (
          <span className="text-slate-500">Press and hold. A quick tap will not send anything.</span>
        )}
      </div>
    </div>
  );
}
