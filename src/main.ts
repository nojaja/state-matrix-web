import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

// Enhanced rAF monitor: aggregate caller stacks and throttle if runaway detected.
// This is debugging instrumentation — remove after root cause fixed.
try {
  const origRaf = (globalThis as any).requestAnimationFrame;
  const origCaf = (globalThis as any).cancelAnimationFrame;
  if (typeof origRaf === 'function') {
    const stackCounts: Map<string, number> = new Map();
    let callsInWindow = 0;
    let windowStart = Date.now();
    const WINDOW_MS = 1000;
    const WARN_THRESHOLD = 60; // calls per second considered excessive
    const LOG_INTERVAL = 5000;

    function sanitizeStack(stack: string | undefined) {
      if (!stack) return 'unknown';
      // Keep only top few frames and remove vendor/internal noise
      const lines = stack.split('\n').slice(1, 8).map(l => l.trim());
      return lines.join(' | ');
    }

    (globalThis as any).requestAnimationFrame = function (cb: FrameRequestCallback) {
      // capture stack where rAF was requested
      const stack = sanitizeStack((new Error()).stack);
      stackCounts.set(stack, (stackCounts.get(stack) || 0) + 1);

      const now = Date.now();
      if (now - windowStart > WINDOW_MS) {
        if (callsInWindow > WARN_THRESHOLD) {
          console.warn('[rAF-monitor] high rAF rate:', callsInWindow, 'calls/sec');
          // Log top stacks
          try {
            const entries = Array.from(stackCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
            console.group('[rAF-monitor] top caller stacks');
            for (const [s, c] of entries) {
              console.warn(`${c} calls:`, s.replace(/\s+/g, ' '));
            }
            console.groupEnd();
          } catch (e) { console.warn('[rAF-monitor] log failed', e) }
        }
        callsInWindow = 0;
        windowStart = now;
        stackCounts.clear();
      }
      callsInWindow++;

      // Throttle fallback: if extreme rate, use setTimeout to avoid continuous RAF flood
      if (callsInWindow > WARN_THRESHOLD * 5) {
        return (globalThis as any).setTimeout(() => cb(performance.now()), 16) as any;
      }

      // Wrap callback to detect if it schedules more rAFs (sampled)
      const wrapped = (t: number) => {
        try { cb(t) } catch (e) { console.error('[rAF-monitor] callback error', e) }
      };
      return origRaf.call(globalThis, wrapped);
    };

    if (typeof origCaf === 'function') {
      (globalThis as any).cancelAnimationFrame = function (id: number) { return origCaf.call(globalThis, id) };
    }

    // Expose rAF monitor utilities for debugging in console
    (globalThis as any).__rAFMonitor = {
      getTopStacks: (limit = 20) => Array.from(stackCounts.entries()).sort((a: any, b: any) => b[1] - a[1]).slice(0, limit),
      clear: () => stackCounts.clear(),
      getWindowCalls: () => callsInWindow,
      setWarnThreshold: (_v: number) => { /* noop: read-only in runtime */ }
    };

    // Periodic logger to help offline analysis
    setInterval(() => {
      try {
        const entries = Array.from(stackCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (entries.length > 0) {
          console.info('[rAF-monitor] periodic summary (top stacks):');
          for (const [s, c] of entries) {
            console.info(`${c} calls:`, s.replace(/\s+/g, ' '));
          }
        }
      } catch (e) {
        // ignore
      }
    }, LOG_INTERVAL);
  }
} catch (e) {
  console.warn('[rAF-monitor] init failed', e);
}

const pinia = createPinia()
app.use(pinia)
app.use(router)

// ルートガード: プロジェクトが選択されていない初回アクセス時は /project へ誘導
// dynamic import をルート遷移時に行い、初期ロードのブロッキングを軽減する
router.beforeEach(async (to, from, next) => {
  void from;
  try {
    const { useProjectStore } = await import('./stores/projectStore')
    const projectStore = useProjectStore()
    if (!projectStore.selectedProject && to.name !== 'project') {
      next({ name: 'project' })
      return
    }
  } catch (e) {
    // モジュールがロードできない場合は安全に進める
    console.error('projectStore import failed', e)
  }
  next()
})

app.mount('#app')
