import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';

import type { CustomAuthState, InMemoryAuthStorage } from './types';

const readData = <T>(value: unknown): T => JSON.parse(JSON.stringify(value, BufferJSON.replacer), BufferJSON.reviver) as T;

export const createInMemoryAuthState = (
  initialStorage?: Partial<InMemoryAuthStorage>,
): CustomAuthState => {
  const storage: InMemoryAuthStorage = {
    creds: initialStorage?.creds ? readData(initialStorage.creds) : initAuthCreds(),
    keys: initialStorage?.keys ? readData(initialStorage.keys) : {},
  };

  const state = {
    creds: storage.creds,
    keys: {
      get: async (type: string, ids: string[]) => {
        const keyStore = storage.keys[type] || {};
        const data: Record<string, unknown> = {};

        for (const id of ids) {
          const value = keyStore[id];
          if (value) {
            data[id] = readData(value);
          }
        }

        return data;
      },
      set: async (data: Record<string, Record<string, unknown>>) => {
        for (const category of Object.keys(data)) {
          storage.keys[category] = storage.keys[category] || {};
          const categoryData = data[category];

          if (!categoryData) {
            continue;
          }

          for (const id of Object.keys(categoryData)) {
            const value = categoryData[id];

            if (value) {
              storage.keys[category][id] = readData(value);
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
      storage.creds = readData(state.creds);
    },
  };
};
