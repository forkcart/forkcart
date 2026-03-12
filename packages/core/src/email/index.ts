export { EmailService } from './service';
export type { EmailServiceDeps } from './service';
export { EmailProviderRegistry } from './registry';
export { EmailLogRepository } from './log-repository';
export type { EmailLogEntry, CreateEmailLogInput } from './log-repository';
export { registerEmailEventListeners } from './event-listeners';
export type {
  EmailProvider,
  EmailSendInput,
  EmailSendResult,
  EmailProviderSettingDef,
} from './provider';
export * from './templates/index';
