/**
 * ReactDOM shim for ForkCart plugin components.
 *
 * Maps `import ... from "react-dom"` to the host application's
 * ReactDOM instance exposed via ReactGlobals.
 */

const RD = window.__FORKCART_REACT_DOM;

export const createPortal = RD.createPortal;
export const flushSync = RD.flushSync;
export const createRoot = RD.createRoot;
export const hydrateRoot = RD.hydrateRoot;
export const findDOMNode = RD.findDOMNode;
export const unmountComponentAtNode = RD.unmountComponentAtNode;
export const render = RD.render;
export const hydrate = RD.hydrate;
export const version = RD.version;

export default RD;
