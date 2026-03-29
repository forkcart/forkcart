'use client';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactJSXRuntime from 'react/jsx-runtime';

// Expose React globally so dynamically loaded plugin components
// can use the SAME React instance (avoids dual-React hooks crash)
if (typeof window !== 'undefined') {
  const g = window as unknown as Record<string, unknown>;
  g.__FORKCART_REACT = React;
  g.__FORKCART_REACT_DOM = ReactDOM;
  g.__FORKCART_REACT_JSX = ReactJSXRuntime;
}

export function ReactGlobals() {
  return null;
}
