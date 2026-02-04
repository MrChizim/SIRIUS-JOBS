import EventEmitter from 'node:events';

export const events = new EventEmitter();

export type NotificationEvent = {
  userId: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

events.setMaxListeners(50);
