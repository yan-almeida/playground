import { Serializable } from 'node:child_process';
import { AckeableCluster } from './ackeable.cluster';

export class RetryableCluster<
  ContentType,
> extends AckeableCluster<ContentType> {
  #inboxQueue = new Map<string, Serializable>();
}
