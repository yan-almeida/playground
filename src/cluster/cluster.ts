import { ChildProcess, fork, Serializable } from 'node:child_process';
import { ClusterCallback, ClusterSignal, InitializeCluster } from '.';
import logger from '../logger';
import { roundRobin } from '../round-robin';
import { CheckSumGenerator } from '../utils/check-sum.generator';
import { ClusterMessage } from './cluster.message';

const DEFAULT_CLUSTER_SIZE = 50;

/**
 * Abstract base class for managing a cluster of child processes with load balancing and automatic respawning.
 *
 * @template CbMessage - The type of messages that can be received from child processes. Defaults to `Serializable`.
 * @template SendReturn - The return type of the send method. Defaults to `boolean`.
 *
 * @remarks
 * This class provides functionality to:
 * - Spawn and manage multiple child processes
 * - Distribute messages across workers using round-robin load balancing
 * - Automatically respawn workers that crash or exit unexpectedly
 * - Handle process lifecycle events (exit, error, message)
 *
 * Subclasses must implement the `send` method to define how messages are sent to workers.
 *
 * @example
 * ```typescript
 * class MyCluster extends Cluster<MyMessage, ClusterMessage> {
 *   send(message: MyMessage): ClusterMessage {
 *     return this.internalSend(message);
 *   }
 * }
 *
 * const cluster = new MyCluster({
 *   file: './worker.js',
 *   size: 4,
 *   callback: (pid, message) => {
 *     console.log(`Received from ${pid}:`, message);
 *   }
 * });
 * ```
 */
export abstract class Cluster<
  CbMessage = Serializable,
  SendReturn extends ClusterMessage | boolean = boolean,
> {
  protected file: string;
  protected size = 0;

  #processes = new Map<number, ChildProcess>();
  #callback: ClusterCallback<CbMessage>;
  #balancer: () => ChildProcess;

  get process(): ChildProcess {
    return this.#balancer();
  }

  get totalProcesses(): number {
    return this.#processes.size;
  }

  protected constructor({
    size = DEFAULT_CLUSTER_SIZE,
    ...args
  }: InitializeCluster<CbMessage>) {
    this.size = size;
    this.#callback = args.callback;
    this.file = args.file;

    this.initialize();
  }

  protected initialize(size = this.size) {
    for (let index = 0; index < size; index++) {
      this.#spawnWorker(this.file, this.#callback);
      logger.fork(`Spawned worker for file: ${index}::${this.file}`);
    }

    this.#recreateBalancer();
  }

  #recreateBalancer(): void {
    this.#balancer = roundRobin([...this.#processes.values()]);
  }

  abstract send(message: Serializable): SendReturn;

  protected internalSend(message: Serializable): ClusterMessage {
    if (message == null || typeof message === 'undefined') {
      throw new Error('Message cannot be null or undefined');
    }

    const process = this.process;

    if (!process || process.killed) {
      logger.fork(`Process is already killed, cannot send message.`);
      return;
    }
    logger.fork(
      `Sending message to ${process.pid} - ${JSON.stringify(message)}`,
    );

    if (ClusterMessage.instanceof(message)) {
      process.send(message);

      logger.fork(
        `Sent message with key: ${message.key} - already cluster message`,
      );

      return message;
    }

    const hash = CheckSumGenerator.toHash(Buffer.from(JSON.stringify(message)));

    const clusterMessage = new ClusterMessage({ key: hash, message });
    process.send(clusterMessage);

    logger.fork(`Sent message with key: ${clusterMessage.key}`);
    return clusterMessage;
  }

  kill(pid?: number, shouldRespawn = false): void {
    const signal = shouldRespawn ? ClusterSignal.RESPAWNABLE : null;

    if (!pid) {
      for (const child of this.#processes.values()) {
        child.kill(signal);
      }

      return;
    }

    const process = this.#processes.get(pid);

    if (!process) {
      logger.fork(`${pid}: Cannot kill process - process not found`);
      return;
    }

    process.kill(signal);
  }

  #spawnWorker(file: string, callback: ClusterCallback<CbMessage>): void {
    const child = fork(file);

    if (!child?.pid) {
      logger.fork(`Failed to fork child process for file: ${file}`);
      return;
    }

    child.on('exit', (code, signal) => {
      this.#processes.delete(child.pid);
      this.#recreateBalancer();

      const shouldRespawn = ClusterSignal.RESPAWNABLE === code;
      const exitBySideEffect = !shouldRespawn && code !== 0;

      if (!exitBySideEffect) {
        logger.fork(`${child.pid}: Child process exited normally.`);
        return;
      }

      logger.fork(
        `${child.pid}: Child process exited with code ${code} and signal ${signal} - respawning`,
      );
      this.#spawnWorker(file, callback);
    });

    child.on('error', (error) => {
      logger.fork(
        `${child.pid}: Child process encountered an error: ${error.message}`,
      );
      this.kill(child.pid, true);
    });

    child.on('message', (message) => {
      logger.fork(`${child.pid}: Received message ${JSON.stringify(message)}`);
      return callback(child.pid, message as CbMessage);
    });

    this.#processes.set(child.pid, child);
    this.#recreateBalancer();
  }
}
