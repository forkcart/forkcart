import { createLogger } from '../lib/logger';
import type { DomainEvent, EventHandler } from './types';

const logger = createLogger('event-bus');

/**
 * In-process event bus for domain events.
 * Plugins and modules subscribe to events to react to business logic changes.
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler<unknown>>>();

  /** Subscribe to an event type */
  on<TPayload>(eventType: string, handler: EventHandler<TPayload>): void {
    const existing = this.handlers.get(eventType) ?? new Set();
    existing.add(handler as EventHandler<unknown>);
    this.handlers.set(eventType, existing);
    logger.debug({ eventType }, 'Handler registered');
  }

  /** Unsubscribe from an event type */
  off<TPayload>(eventType: string, handler: EventHandler<TPayload>): void {
    const existing = this.handlers.get(eventType);
    if (existing) {
      existing.delete(handler as EventHandler<unknown>);
    }
  }

  /** Emit an event to all registered handlers */
  async emit<TPayload>(eventType: string, payload: TPayload): Promise<void> {
    const event: DomainEvent<TPayload> = {
      type: eventType,
      payload,
      timestamp: new Date(),
    };

    const handlers = this.handlers.get(eventType);
    if (!handlers || handlers.size === 0) {
      return;
    }

    logger.debug({ eventType, handlerCount: handlers.size }, 'Emitting event');

    const promises = [...handlers].map(async (handler) => {
      try {
        await handler(event as DomainEvent<unknown>);
      } catch (error) {
        logger.error({ eventType, error }, 'Event handler failed');
      }
    });

    await Promise.allSettled(promises);
  }

  /** Remove all handlers (useful for testing) */
  clear(): void {
    this.handlers.clear();
  }

  /** Remove specific handlers for multiple event types (used during plugin deactivation) */
  removeHandlers(handlerMap: Map<string, EventHandler<unknown>>): void {
    for (const [eventType, handler] of handlerMap) {
      const existing = this.handlers.get(eventType);
      if (existing) {
        existing.delete(handler);
        if (existing.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    }
  }

  /** Get the count of registered handlers (useful for diagnostics) */
  get handlerCount(): number {
    let count = 0;
    for (const handlers of this.handlers.values()) {
      count += handlers.size;
    }
    return count;
  }
}
