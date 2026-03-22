declare const require: (name: string) => any;
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): any;
declare function clearTimeout(timeoutId: any): void;

declare const process: {
  env: Record<string, string | undefined>;
  exit: (code?: number) => never;
};

declare namespace NodeJS {
  type Timeout = any;
}

declare module 'express' {
  const express: any;
  export const Router: any;
  export = express;
}

declare module 'pino' {
  const pino: any;
  export = pino;
}

declare module 'nanoid' {
  export const customAlphabet: (alphabet: string, size: number) => () => string;
}

declare module '@whiskeysockets/baileys' {
  const baileys: any;
  export = baileys;
}

declare module '@hapi/boom' {
  const boom: any;
  export = boom;
}
