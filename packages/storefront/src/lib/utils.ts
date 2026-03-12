import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('forkcart_session');
  if (!id) {
    id = generateSessionId();
    localStorage.setItem('forkcart_session', id);
  }
  return id;
}
