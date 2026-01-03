import { Serializable } from 'child_process';
import { InitializeCluster, InitializeQueuedCluster, QueuedCluster } from '.';
import logger from '../logger';
import { ClusterMessage } from './cluster.message';
import { TaskMessage } from './task.message';

export class AckeableCluster<ContentType> extends QueuedCluster<ContentType> {
  #inboxQueue = new Map<string, Serializable>();

  protected constructor(args: InitializeCluster<TaskMessage<ContentType>>, maxEntities?: number) {
    super(
      {
        ...args,
        callback: (pid, message) =>
          Promise.resolve(args.callback(pid, message)).then(() => {
            logger.ackeableFork(`Acknowledging message with key: ${message?.key}`);
            message?.key && this.#ack(message.key);
          }),
      },
      maxEntities,
    );
  }

  static from<ContentType extends Serializable>({
    maxEntities,
    ...args
  }: InitializeQueuedCluster<TaskMessage<ContentType>>): AckeableCluster<ContentType> {
    const instance = new this(args, maxEntities);

    return instance;
  }

  send(message: Serializable): ClusterMessage<Serializable> {
    const sent = super.send(message);
    this.#inboxQueue.set(sent.key, message);
    logger.ackeableFork(`Message sent to inbox queue with hash: ${sent.key}`);
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
        deleted ? `Acknowledged message with key: ${key}` : `Failed to acknowledge message with key: ${key}`,
      );

      return true;
    } catch (error) {
      logger.ackeableFork(`Failed to acknowledge message with key: ${key}`);
      return false;
    }
  }
}

// const sent = super.send(message);

// this.#inboxQueue.set(sent.key, message);
// logger.fork(`Message sent to inbox queue with hash: ${sent.key}`);

// return sent;
