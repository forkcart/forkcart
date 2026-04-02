/**
 * JSX runtime shim for ForkCart plugin components.
 *
 * Maps `import ... from "react/jsx-runtime"` to the host application's
 * JSX runtime exposed via ReactGlobals.
 */

const JSX = window.__FORKCART_REACT_JSX;

export const jsx = JSX.jsx;
export const jsxs = JSX.jsxs;
export const jsxDEV = JSX.jsxDEV;
export const Fragment = JSX.Fragment;

export default JSX;
