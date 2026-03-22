const { customAlphabet } = require('nanoid');

const sessionRandom = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);
const publicCodeRandom = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

export const createSessionId = (): string => {
  return `tvn_${Date.now()}_${sessionRandom()}`;
};

export const createPublicCode = (): string => {
  return `TVN-CSS-${publicCodeRandom()}`;
};
