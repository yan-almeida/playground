import debug from 'debug';

const fork = debug('cluster:fork');
const ackeableFork = debug('cluster:ackeable-fork');

const task = debug('cluster:task');
const emitter = debug('set:emitter');

const balancer = debug('cluster:balancer');

export default { fork, task, balancer, emitter, ackeableFork };
