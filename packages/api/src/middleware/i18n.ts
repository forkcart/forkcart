/** Extend Hono context with locale */
declare module 'hono' {
  interface ContextVariableMap {
    locale: string;
  }
}

export {};
