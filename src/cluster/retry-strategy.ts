import ms from 'ms';
import logger from '../logger';

export interface RetryConfig {
  /**
   * Maximum number of retry attempts before giving up.
   */
  maxRetryAttempts: number;
  /**
   * Initial delay before the first retry attempt, in milliseconds.
   */
  initialDelayMs: number;
  /**
   * Maximum delay between retry attempts, in milliseconds.
   */
  maxDelayMs: number;
  /**
   * Jitter factor to randomize delay, between 0 and 1.
   */
  jitterFactor: number;
}

export interface RetryState {
  attempts: number;
  lastAttemptAt: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetryAttempts: 3,
  initialDelayMs: ms('1s'),
  maxDelayMs: ms('30s'),
  jitterFactor: 0.1,
};

class RetryStrategyError extends Error {}

export class RetryStrategy {
  #config: RetryConfig;
  #retryState = new Map<string, RetryState>();

  constructor(config: Partial<RetryConfig> = {}) {
    this.#config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.#validateConfig();
  }

  #validateConfig(): void {
    if (this.#config.maxRetryAttempts < 0) {
      throw new RetryStrategyError('maxRetryAttempts must be non-negative');
    }
    if (this.#config.initialDelayMs <= 0) {
      throw new RetryStrategyError('initialDelayMs must be positive');
    }
    if (this.#config.maxDelayMs < this.#config.initialDelayMs) {
      throw new RetryStrategyError(
        'maxDelayMs must be greater than or equal to initialDelayMs',
      );
    }
    if (this.#config.jitterFactor < 0 || this.#config.jitterFactor > 1) {
      throw new RetryStrategyError('jitterFactor must be between 0 and 1');
    }
  }

  calculateDelay(attempt: number): number {
    const { initialDelayMs, maxDelayMs, jitterFactor } = this.#config;

    const exponentialDelay = initialDelayMs * Math.pow(2, attempt);

    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

    const jitterRange = cappedDelay * jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterRange;

    const finalDelay = Math.max(0, cappedDelay + jitter);

    logger.retryStrategy(
      `Calculated delay for attempt ${attempt}: ${finalDelay.toFixed(
        2,
      )}ms (base: ${exponentialDelay}ms, capped: ${cappedDelay}ms, jitter: ${jitter.toFixed(
        2,
      )}ms)`,
    );

    return finalDelay;
  }

  shouldRetry(key: string): boolean {
    const state = this.#retryState.get(key);
    const currentAttempts = state?.attempts ?? 0;
    const canRetry = currentAttempts < this.#config.maxRetryAttempts;

    logger.retryStrategy(
      `Checking if key ${key} should retry: ${canRetry} (attempts: ${currentAttempts}/${
        this.#config.maxRetryAttempts
      })`,
    );

    return canRetry;
  }

  incrementAttempt(key: string): number {
    const state = this.#retryState.get(key);
    const newAttempts = (state?.attempts ?? 0) + 1;

    this.#retryState.set(key, {
      attempts: newAttempts,
      lastAttemptAt: Date.now(),
    });

    logger.retryStrategy(
      `Incremented attempt for key ${key}: ${newAttempts}/${
        this.#config.maxRetryAttempts
      }`,
    );

    return newAttempts;
  }

  reset(key?: string): void {
    if (!key) {
      const size = this.#retryState.size;
      this.#retryState.clear();
      logger.retryStrategy(`Cleared all retry state (${size} entries)`);
      return;
    }

    const deleted = this.#retryState.delete(key);
    logger.retryStrategy(
      deleted
        ? `Reset retry state for key ${key}`
        : `No retry state found for key ${key}`,
    );
  }

  getState(key: string): Readonly<RetryState> {
    const state = this.#retryState.get(key);

    return { ...state };
  }

  get config(): Readonly<RetryConfig> {
    return { ...this.#config };
  }
}
