import { AsyncLocalStorage } from "node:async_hooks";

export interface IRequestContext {
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
  user?: Record<string, unknown>;
}

const asyncLocalStorage = new AsyncLocalStorage<IRequestContext>();

export const RequestContext = {
  run: <R>(context: IRequestContext, fn: () => R): R => {
    return asyncLocalStorage.run(context, fn);
  },

  get: (): IRequestContext | undefined => {
    return asyncLocalStorage.getStore();
  },

  getActorId: (): string | undefined => {
    return asyncLocalStorage.getStore()?.actorId;
  },

  getIpAddress: (): string | undefined => {
    return asyncLocalStorage.getStore()?.ipAddress;
  },

  getUserAgent: (): string | undefined => {
    return asyncLocalStorage.getStore()?.userAgent;
  },

  setContext: (updates: Partial<IRequestContext>): void => {
    const store = asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, updates);
    }
  },
};
