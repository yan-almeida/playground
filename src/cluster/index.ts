import { Serializable } from 'node:child_process';

export type ClusterCallback<Message = Serializable> = (pid: number, message: Message) => void | Promise<void>;

export interface InitializeCluster<Message = Serializable> {
  file: string;
  size?: number;
  callback: ClusterCallback<Message>;
}

export interface InitializeQueuedCluster<Message = Serializable> extends InitializeCluster<Message> {
  maxEntities?: number;
}

export interface InitializeAutoRecCluster<Message = Serializable> extends InitializeCluster<Message> {
  disableAutoRecovery?: true;
}

export enum ClusterSignal {
  RESPAWNABLE = 999901,
}

export * from './cluster';
export * from './queued-cluster';
