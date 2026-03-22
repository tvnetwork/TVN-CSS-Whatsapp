export const normalizePhoneNumber = (value: string): string => {
  const normalized = value.replace(/\+/g, '').replace(/\D/g, '');

  if (!normalized) {
    throw new Error('Phone number is required');
  }

  if (normalized.startsWith('0')) {
    throw new Error('Phone number must include country code');
  }

  if (normalized.length < 8) {
    throw new Error('Phone number is too short');
  }

  return normalized;
};
