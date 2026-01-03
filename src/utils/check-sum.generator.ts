import { createHash } from 'node:crypto';

export class CheckSumGenerator {
  static toHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
