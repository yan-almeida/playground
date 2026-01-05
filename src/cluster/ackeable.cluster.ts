import { Serializable } from 'child_process';
import { ClusterCallback, InitializeCluster, InitializeQueuedCluster } from '.';
import logger from '../logger';
import { ClusterMessage } from './cluster.message';
import { QueuedCluster } from './queued-cluster';
import { TaskMessage } from './task.message';

export class AckeableCluster<ContentType> extends QueuedCluster<ContentType> {
  #inboxQueue = new Map<string, Serializable>();

  protected constructor(
    args: InitializeCluster<TaskMessage<ContentType>>,
    maxEntities?: number,
  ) {
    super(
      {
        ...args,
        callback: (pid, message) =>
          this.ackableCallback(args.callback, pid, message),
      },
      maxEntities,
    );
  }

  protected getInboxMessage(key: string) {
    if (!key) {
      logger.ackeableFork('Attempted to get inbox message with empty key');
      return;
    }

    return this.#inboxQueue.get(key);
  }

  protected ackableCallback(
    originalCb: ClusterCallback<TaskMessage<ContentType>>,
    ...[pid, message]: Parameters<
      InitializeCluster<TaskMessage<ContentType>>['callback']
    >
  ) {
    return Promise.resolve(originalCb(pid, message))
      .then(() => {
        message?.key && this.#ack(message.key);
      })
      .catch(logger.ackeableFork);
  }

  static from<ContentType extends Serializable>({
    maxEntities,
    ...args
  }: InitializeQueuedCluster<
    TaskMessage<ContentType>
  >): AckeableCluster<ContentType> {
    const instance = new this(args, maxEntities);

    return instance;
  }

  send(message: Serializable): ClusterMessage<Serializable> {
    const sent = super.send(message);

    this.#inboxQueue.set(sent.key, message);
    logger.ackeableFork(
      `Message sent to inbox queue with hash: ${sent.key} size: ${
        this.#inboxQueue.size
      }`,
    );
    return sent;
  }

  #ack(key?: string): boolean {
    if (!key) {
      this.#inboxQueue.clear();
      logger.ackeableFork('Cleared inbox queue');
      return true;
    }

    try {
      const deleted = this.#inboxQueue.delete(key);

      logger.ackeableFork(
        (deleted
          ? `Acknowledged message with key: ${key}`
          : `Failed to acknowledge message with key: ${key}`) +
          ` size: ${this.#inboxQueue.size}`,
      );

      return true;
    } catch (error) {
      logger.ackeableFork(`Failed to acknowledge message with key: ${key}`);
      return false;
    }
  }
}
