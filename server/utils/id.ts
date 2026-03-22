import { customAlphabet } from 'nanoid';

const sessionRandom = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);
const publicCodeRandom = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

export const createSessionId = (): string => `tvn_${Date.now()}_${sessionRandom()}`;

export const createPublicCode = (): string => `TVN-CSS-${publicCodeRandom()}`;
