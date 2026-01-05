import debug from 'debug';

const fork = debug('cluster:fork');
const ackeableFork = debug('cluster:ackeable-fork');
const retryableFork = debug('cluster:retryable-fork');

const task = debug('cluster:task');
const emitter = debug('set:emitter');

const balancer = debug('cluster:balancer');

const retryStrategy = debug('cluster:retry-strategy');
const retryScheduler = debug('cluster:retry-scheduler');

export default {
  fork,
  task,
  balancer,
  emitter,
  ackeableFork,
  retryableFork,
  retryStrategy,
  retryScheduler,
};
