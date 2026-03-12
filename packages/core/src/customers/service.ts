import type { CreateCustomerInput, UpdateCustomerInput, Pagination } from '@forkcart/shared';
import { NotFoundError, ConflictError } from '@forkcart/shared';
import type { CustomerRepository } from './repository';
import type { EventBus } from '../plugins/event-bus';
import { CUSTOMER_EVENTS } from './events';
import { createLogger } from '../lib/logger';

const logger = createLogger('customer-service');

export interface CustomerServiceDeps {
  customerRepository: CustomerRepository;
  eventBus: EventBus;
}

export class CustomerService {
  private readonly repo: CustomerRepository;
  private readonly events: EventBus;

  constructor(deps: CustomerServiceDeps) {
    this.repo = deps.customerRepository;
    this.events = deps.eventBus;
  }

  async getById(id: string) {
    const customer = await this.repo.findByIdWithOrders(id);
    if (!customer) {
      throw new NotFoundError('Customer', id);
    }
    return customer;
  }

  async list(filter: { search?: string }, pagination: Pagination) {
    return this.repo.findMany(filter, pagination);
  }

  async create(input: CreateCustomerInput) {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`Customer with email "${input.email}" already exists`);
    }

    const customer = await this.repo.create(input);
    logger.info({ customerId: customer.id, email: customer.email }, 'Customer created');
    await this.events.emit(CUSTOMER_EVENTS.CREATED, { customer });

    return customer;
  }

  async update(id: string, input: UpdateCustomerInput) {
    if (input.email) {
      const existing = await this.repo.findByEmail(input.email);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Customer with email "${input.email}" already exists`);
      }
    }

    const customer = await this.repo.update(id, input);
    if (!customer) {
      throw new NotFoundError('Customer', id);
    }

    logger.info({ customerId: customer.id }, 'Customer updated');
    await this.events.emit(CUSTOMER_EVENTS.UPDATED, { customer });

    return customer;
  }
}
