import ms from 'ms';
import { setTimeout } from 'node:timers/promises';
import { RetryableCluster } from './cluster/retryable.cluster';
import { TaskMessage } from './cluster/task.message';

async function* generate(): AsyncIterable<number> {
  while (true) {
    const random = Math.random();

    const number = Math.round(random * 100);
    yield number;

    await setTimeout(ms('30s'));
    // yield number;
  }
}

const TASK_FILE = `./src/tasks/fibonacci.task.ts`;

const cluster = RetryableCluster.from<number>({
  file: TASK_FILE,
  size: 2,
  maxEntities: 10,
  callback: async (pid: number, { message }: TaskMessage<number>) => {
    console.log(`[${pid}] Received result:`, message);

    if (Math.random()) {
      throw new Error('Simulated callback failure');
    }

    console.log(`[${pid}] Sucess:`, message);

    return;
  },
});

cluster.send(20);
setInterval(() => {
  console.info(cluster.healthCheck());
}, ms('1.5s'));
// (async () => {
//   for await (const data of generate()) {
//     cluster.send(data);
//   }
// })();
