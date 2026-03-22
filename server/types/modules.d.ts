declare module 'express' {
  const express: any;
  export const Router: any;
  export default express;
}

declare module 'pino' {
  const pino: any;
  export default pino;
}

declare module 'nanoid' {
  export const customAlphabet: (alphabet: string, size: number) => () => string;
}

declare module '@hapi/boom' {
  const Boom: any;
  export default Boom;
}

declare module 'baileys' {
  const makeWASocket: any;
  export const Browsers: any;
  export const DisconnectReason: any;
  export const fetchLatestBaileysVersion: any;
  export const jidNormalizedUser: any;
  export const BufferJSON: any;
  export const initAuthCreds: any;
  export default makeWASocket;
}

declare const process: {
  env: Record<string, string | undefined>;
};
