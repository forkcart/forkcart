/** Generic paginated response type */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Standard API response wrapper */
export interface ApiResponse<T> {
  data: T;
}

/** Standard API error response */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Repository interface for dependency inversion */
export interface Repository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findMany(filter?: Record<string, unknown>): Promise<T[]>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

/** Event handler type */
export type EventHandler<TPayload = unknown> = (payload: TPayload) => void | Promise<void>;

/** Event emitter interface */
export interface EventEmitter {
  on<TPayload>(event: string, handler: EventHandler<TPayload>): void;
  off<TPayload>(event: string, handler: EventHandler<TPayload>): void;
  emit<TPayload>(event: string, payload: TPayload): Promise<void>;
}

/** Service context passed to all business logic functions */
export interface ServiceContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
}
