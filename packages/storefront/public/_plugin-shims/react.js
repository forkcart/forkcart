/**
 * React shim for ForkCart plugin components.
 *
 * Maps the bare `import ... from "react"` in plugin ESM bundles
 * to the host application's React instance exposed via ReactGlobals.
 *
 * All React 18 hooks and APIs are re-exported so plugins can use
 * any public React API without bundling their own copy.
 */

const R = window.__FORKCART_REACT;

// ─── Hooks ───────────────────────────────────────────────────────────────────
export const useState = R.useState;
export const useEffect = R.useEffect;
export const useContext = R.useContext;
export const useReducer = R.useReducer;
export const useCallback = R.useCallback;
export const useMemo = R.useMemo;
export const useRef = R.useRef;
export const useId = R.useId;
export const useSyncExternalStore = R.useSyncExternalStore;
export const useTransition = R.useTransition;
export const useDeferredValue = R.useDeferredValue;
export const useImperativeHandle = R.useImperativeHandle;
export const useLayoutEffect = R.useLayoutEffect;
export const useDebugValue = R.useDebugValue;
export const useInsertionEffect = R.useInsertionEffect;

// ─── Components & Sentinels ──────────────────────────────────────────────────
export const Fragment = R.Fragment;
export const StrictMode = R.StrictMode;
export const Suspense = R.Suspense;
export const Profiler = R.Profiler;

// ─── Component Utilities ─────────────────────────────────────────────────────
export const memo = R.memo;
export const forwardRef = R.forwardRef;
export const lazy = R.lazy;

// ─── Element APIs ────────────────────────────────────────────────────────────
export const createElement = R.createElement;
export const cloneElement = R.cloneElement;
export const createRef = R.createRef;
export const isValidElement = R.isValidElement;
export const Children = R.Children;

// ─── Context ─────────────────────────────────────────────────────────────────
export const createContext = R.createContext;

// ─── Concurrent APIs ─────────────────────────────────────────────────────────
export const startTransition = R.startTransition;
export const use = R.use;

// ─── Version ─────────────────────────────────────────────────────────────────
export const version = R.version;

// ─── Default export (the full React namespace) ───────────────────────────────
export default R;
