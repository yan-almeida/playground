import { Serializable } from 'child_process';
import { ClusterCallback, InitializeRetryableCluster } from '.';
import logger from '../logger';
import { AckeableCluster } from './ackeable.cluster';
import { RetryScheduler } from './retry-scheduler';
import { RetryStrategy } from './retry-strategy';
import { RetryableTaskMessage, TaskMessage } from './task.message';

export class RetryableCluster<
  ContentType,
> extends AckeableCluster<ContentType> {
  #retryStrategy: RetryStrategy;
  #retryScheduler: RetryScheduler;

  protected constructor(
    args: InitializeRetryableCluster<TaskMessage<ContentType>>,
  ) {
    super(
      {
        ...args,
        callback: (pid, message) =>
          this.retryableCallback(args.callback, pid, message),
      },
      args.maxEntities,
    );

    this.#retryStrategy = new RetryStrategy(args.retryConfig);
    this.#retryScheduler = new RetryScheduler();
  }

  static from<ContentType extends Serializable>(
    args: InitializeRetryableCluster<TaskMessage<ContentType>>,
  ): RetryableCluster<ContentType> {
    const instance = new this(args);
    return instance;
  }

  protected async retryableCallback(
    originalCb: ClusterCallback<TaskMessage<ContentType>>,
    ...[pid, message]: Parameters<ClusterCallback<TaskMessage<ContentType>>>
  ): Promise<void> {
    return Promise.resolve(originalCb(pid, message)).catch((error) => {
      const key = typeof message === 'object' ? message['key'] : null;

      if (!key) {
        logger.retryableFork(
          `Cannot retry message without key from pid ${pid}`,
        );
        return;
      }

      logger.retryableFork(
        `Callback failed for key ${key} from pid ${pid}: ${error}`,
      );

      if (!this.#retryStrategy.shouldRetry(key)) {
        logger.retryableFork(
          `Max retry attempts reached for key ${key}, giving up`,
        );
        this.#retryStrategy.reset(key);
        this.#retryScheduler.cancel(key);
        return;
      }

      const attempt = this.#retryStrategy.incrementAttempt(key);
      const delay = this.#retryStrategy.calculateDelay(attempt - 1);

      logger.retryableFork(
        `Scheduling retry ${attempt}/${
          this.#retryStrategy.config.maxRetryAttempts
        } for key ${key} in ${delay.toFixed(2)}ms`,
      );

      this.#retryScheduler.schedule(key, delay, () => {
        logger.retryableFork(
          `Executing retry for key ${key} (attempt ${attempt})`,
        );

        // Retrieve original message from inbox queue and resend
        const originalMessage = this.getInboxMessage(key);

        if (!originalMessage) {
          logger.retryableFork(
            `Cannot retry - original message not found in inbox for key ${key}`,
          );
          this.#retryStrategy.reset(key);
          this.#retryScheduler.cancel(key);
          return;
        }

        // Resend the message - it will go through the full flow again

        const retryableMessage = new RetryableTaskMessage({
          key,
          message: originalMessage,
          state: this.#retryStrategy.getState(key),
        });

        super.send(retryableMessage);
      });

      throw error;
    });
  }

  kill(pid?: number, shouldRespawn?: boolean): void {
    if (!pid) {
      this.#retryScheduler.cancel();
      this.#retryStrategy.reset();
      logger.retryableFork(
        'Cleaned up retry state before killing all processes',
      );
    }

    super.kill(pid, shouldRespawn);
  }
}
