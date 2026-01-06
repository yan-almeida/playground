import { Serializable } from 'node:child_process';
import { InitializeCluster, InitializeQueuedCluster } from '.';
import logger from '../logger';
import { SafeJSONParse } from '../utils/json.parse';
import { MaxNotifiableMap } from '../utils/max-notifiable.map';
import { NotifiableMap } from '../utils/notifiable.map';
import { Cluster } from './cluster';
import { ClusterMessage } from './cluster.message';
import { TaskMessage } from './task.message';

const MAX_ENTITIES = 1000;
const MIN_ENTITIES = 10;

export class QueuedCluster<ContentType> extends Cluster<
  TaskMessage<ContentType>,
  ClusterMessage<Serializable>
> {
  #queue: NotifiableMap<unknown>;

  protected constructor(
    args: InitializeCluster<TaskMessage<ContentType>>,
    maxEntities: number = MIN_ENTITIES,
  ) {
    super(args);

    this.#queue = new MaxNotifiableMap<unknown>(
      Math.min(maxEntities, MIN_ENTITIES, MAX_ENTITIES),
    ).whenReachMax(this.#forceRespawn.bind(this));
  }

  static from<ContentType extends Serializable>({
    maxEntities,
    ...args
  }: InitializeQueuedCluster): QueuedCluster<ContentType> {
    const instance = new this(args, maxEntities) as QueuedCluster<ContentType>;

    return instance;
  }

  send(message: Serializable): ClusterMessage<Serializable> {
    const sent = this.internalSend(message);

    if (!sent) {
      this.#queue.set(sent.key, message);
      logger.fork(`Message queued with hash: ${sent.key}`);
    }

    return sent;
  }

  #forceRespawn() {
    const newSize = this.size - this.totalProcesses;

    if (newSize <= 0) {
      logger.fork('No processes need to be respawned - only requeueing');
      this.#requeue();
      return;
    }

    logger.fork(`Forcing respawn with old size: ${this.size}`);
    logger.fork(
      `Forcing respawn with old processess size: ${this.totalProcesses}`,
    );

    this.initialize(newSize);

    logger.fork(`Forcing respawn with new size: ${this.size}`);
    logger.fork(
      `Forcing respawn with new processess size: ${this.totalProcesses}`,
    );

    this.#requeue();
  }

  #requeue(): void {
    for (const [hash, message] of this.#queue.entries()) {
      const parsed = SafeJSONParse(message);
      const sent = this.send(parsed);

      if (!sent) {
        continue;
      }

      this.#queue.delete(hash);
      logger.fork(`Requeued message with key: ${hash}`);
    }
  }

  queuesToHealthCheck(): Record<string, number> {
    return {
      default: this.#queue.size,
    };
  }
}
