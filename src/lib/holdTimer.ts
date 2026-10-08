/**
 * Press-and-hold controller for the 7-second SOS.
 * Pure timing logic (no React/DOM) so it can be unit-tested with fake clocks.
 *
 *  - start()  begins the hold
 *  - cancel() aborts it (release / pointer cancel / tab hidden)
 *  - onComplete fires exactly once, when `durationMs` of CONTINUOUS holding
 *    has elapsed. A short tap never reaches it.
 */
export interface HoldOptions {
  durationMs: number;
  onTick: (progress: number, elapsedMs: number) => void;
  onComplete: () => void;
  onCancel: () => void;
  now?: () => number;
  setIntervalFn?: (cb: () => void, ms: number) => unknown;
  clearIntervalFn?: (h: unknown) => void;
  setTimeoutFn?: (cb: () => void, ms: number) => unknown;
  clearTimeoutFn?: (h: unknown) => void;
  tickMs?: number;
}

export function createHold(opts: HoldOptions) {
  const now = opts.now ?? (() => performance.now());
  const si = opts.setIntervalFn ?? ((cb, ms) => setInterval(cb, ms));
  const ci = opts.clearIntervalFn ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>));
  const st = opts.setTimeoutFn ?? ((cb, ms) => setTimeout(cb, ms));
  const ct = opts.clearTimeoutFn ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  let startedAt = 0;
  let active = false;
  let interval: unknown = null;
  let timeout: unknown = null;

  function stopTimers() {
    if (interval !== null) ci(interval);
    if (timeout !== null) ct(timeout);
    interval = null;
    timeout = null;
  }

  function complete() {
    if (!active) return; // already completed or cancelled
    active = false;
    stopTimers();
    opts.onTick(1, opts.durationMs);
    opts.onComplete();
  }

  return {
    start() {
      if (active) return;
      active = true;
      startedAt = now();
      opts.onTick(0, 0);
      interval = si(() => {
        if (!active) return;
        const elapsed = now() - startedAt;
        if (elapsed >= opts.durationMs) complete();
        else opts.onTick(elapsed / opts.durationMs, elapsed);
      }, opts.tickMs ?? 50);
      // Backup so completion still fires if interval ticks are throttled.
      timeout = st(complete, opts.durationMs);
    },
    cancel() {
      if (!active) return;
      active = false;
      stopTimers();
      opts.onTick(0, 0);
      opts.onCancel();
    },
    isActive: () => active,
  };
}
