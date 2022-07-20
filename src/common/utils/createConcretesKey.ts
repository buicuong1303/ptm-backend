import * as crypto from 'crypto';

export function createConcretesKey(str: string) {
  return crypto
    .createHash('shake256', { outputLength: 16 })
    .update(str)
    .digest('hex');
}
