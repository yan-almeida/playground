import { Serializable } from 'node:child_process';
import { RetryConfig } from './retry-strategy';

export type ClusterCallback<Message = Serializable> = (
  pid: number,
  message: Message,
) => void | Promise<void>;

export interface InitializeCluster<Message = Serializable> {
  file: string;
  size?: number;
  callback: ClusterCallback<Message>;
}

export interface InitializeQueuedCluster<Message = Serializable>
  extends InitializeCluster<Message> {
  maxEntities?: number;
}

export interface InitializeRetryableCluster<Message = Serializable>
  extends InitializeQueuedCluster<Message> {
  retryConfig?: Partial<RetryConfig>;
}

export interface InitializeAutoRecCluster<Message = Serializable>
  extends InitializeCluster<Message> {
  disableAutoRecovery?: true;
}

export enum ClusterSignal {
  RESPAWNABLE = 999901,
}

export interface QueueStatus {
  queueStatus(): Record<string, number>;
}

export interface ClusterHealth {
  totalWorkers: number;
  aliveWorkers: number;
  queuesSize?: Record<string, number>;
  uptime: number;
}
