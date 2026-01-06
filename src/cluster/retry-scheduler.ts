import { QueueStatus } from '.';
import logger from '../logger';

export class RetryScheduler implements QueueStatus {
  #timeouts = new Map<string, NodeJS.Timeout>();

  queueStatus(): Record<string, number> {
    return {
      [`${RetryScheduler.name}_timeouts`]: this.#timeouts.size,
    };
  }

  schedule(key: string, delayMs: number, callback: () => void): void {
    this.cancel(key);

    logger.retryScheduler(
      `Scheduling retry for key ${key} in ${delayMs.toFixed(2)}ms`,
    );

    const timeout = setTimeout(() => {
      logger.retryScheduler(`Executing scheduled retry for key ${key}`);
      this.#timeouts.delete(key);

      try {
        callback();
      } catch (error) {
        logger.retryScheduler(
          `Error executing retry callback for key ${key}: ${error}`,
        );
      }
    }, delayMs);

    this.#timeouts.set(key, timeout);
  }

  cancel(key?: string): void {
    if (!key) {
      const count = this.#timeouts.size;

      for (const timeout of this.#timeouts.values()) {
        clearTimeout(timeout);
      }
      this.#timeouts.clear();

      logger.retryScheduler(
        `Cancelled all scheduled retries (${count} active)`,
      );
      return;
    }

    const timeout = this.#timeouts.get(key);

    if (!timeout) {
      logger.retryScheduler(`${key}: No scheduled retry found`);
      return;
    }

    clearTimeout(timeout);
    this.#timeouts.delete(key);
    logger.retryScheduler(`${key}: Cancelled scheduled retry`);
  }

  isScheduled(key: string): boolean {
    return this.#timeouts.has(key);
  }

  get activeCount(): number {
    return this.#timeouts.size;
  }
}
