const baileys = require('@whiskeysockets/baileys');

import type { CustomAuthState, InMemoryAuthStorage } from './types';

const BufferJSON = baileys.BufferJSON;
const initAuthCreds = baileys.initAuthCreds;

const cloneData = <T>(value: unknown): T => {
  return JSON.parse(JSON.stringify(value, BufferJSON.replacer), BufferJSON.reviver) as T;
};

export const createInMemoryAuthState = (
  initialStorage?: Partial<InMemoryAuthStorage>,
): CustomAuthState => {
  const storage: InMemoryAuthStorage = {
    creds: initialStorage?.creds ? cloneData(initialStorage.creds) : initAuthCreds(),
    keys: initialStorage?.keys ? cloneData(initialStorage.keys) : {},
  };

  const state = {
    creds: storage.creds,
    keys: {
      get: async (type: string, ids: string[]) => {
        const categoryStore = storage.keys[type] || {};
        const data: Record<string, unknown> = {};

        for (const id of ids) {
          if (categoryStore[id]) {
            data[id] = cloneData(categoryStore[id]);
          }
        }

        return data;
      },
      set: async (data: Record<string, Record<string, unknown>>) => {
        for (const category of Object.keys(data)) {
          storage.keys[category] = storage.keys[category] || {};
          const categoryData = data[category];

          for (const id of Object.keys(categoryData || {})) {
            const value = categoryData[id];

            if (value) {
              storage.keys[category][id] = cloneData(value);
            } else {
              delete storage.keys[category][id];
            }
          }
        }
      },
    },
  };

  return {
    state,
    storage,
    saveCreds: async () => {
      storage.creds = cloneData(state.creds);
    },
  };
};
