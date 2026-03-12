/** Domain event emitted by business logic */
export interface DomainEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** Handler for a specific event type */
export type EventHandler<TPayload = unknown> = (event: DomainEvent<TPayload>) => void | Promise<void>;
