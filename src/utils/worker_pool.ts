// const debug = (...args: any[]) => console.log.call(console, ['worker_pool:', ...args]);
const debug = (...args: any[]) => {};

export class WorkerPool {
  private _queue: { resolve(arg: {worker: Worker; release(): void;}): any, reject(ex: any): void }[] = [];
  private _pool: Worker[] = [];
  private _size: number;

  private _acquisitions = new Map();
  private _releaseResolvers = new Map();

  private _isOpen = false;
  private instantiator: () => Worker;

  constructor(instantiator: () => Worker, size: number) {
    /** @type {import('amqplib').Connection} */
    this._size = size;
    this.instantiator = instantiator;

    this.open();
  }

  softCleanUp = () => {
    this._isOpen = false;

    for (const resolver of this._releaseResolvers.values()) {
      resolver();
    }
  };

  hardCleanUp = () => {
    this.softCleanUp();

    for (const { reject } of this._queue) {
      reject(new Error('WorkerPool: Connection failed.'));
    }
  };

  async *[Symbol.asyncIterator]() {
    if (!this._isOpen) {
      throw new Error('WorkerPool: [Symbol.asyncIterator]() called before pool is open.');
    }

    while (this._isOpen) {
      yield await this.acquire();
    }
  }

  get size() {
    return this._size;
  }

  get isOpen() {
    return this._isOpen;
  }

  open() {
    this._isOpen = true;

    for (let i = 0; i < this._size; i++) {
      this._pool.push(this.createWorker());
    }
  }

  async close() {
    this._isOpen = false;

    debug('WorkerPool: awaiting complete pool release');
    await Promise.all(this._acquisitions.values());

    debug('WorkerPool: closing all workers');
    for (const worker of this._pool) {
      worker.terminate();
    }

    debug('WorkerPool: pool closed successfully');
  }

  acquire() {
    if (!this._isOpen) {
      throw new Error('WorkerPool: acquire() called before pool is open.');
    }

    debug('WorkerPool: acquire()');

    const promise = new Promise<{ worker: Worker; release(): void; }>((res, rej) =>
      this._queue.push({
        resolve: res,
        reject: rej
      })
    );

    if (this._pool.length > 0) {
      debug(
        `WorkerPool: ${this._pool.length} workers available in the pool. dispatch immediately`
      );
      this.dispatchWorkers();
    } else {
      debug('WorkerPool: no workers available in the pool. awaiting...');
    }

    return promise;
  }

  async call<T extends object, R>(method: string, args: T): Promise<R> {
    const { worker, release } = await this.acquire();

    return new Promise((res, rej) => {
      worker.postMessage({
        ...args,
        method
      });

      const errorHandler = (ev: ErrorEvent) => {
        removeHandlers();
        release();
        rej(ev);
      };
      const messageHandler = (ev: MessageEvent) => {
        removeHandlers();
        release();
        res(ev.data);
      }

      const removeHandlers = () => {
        worker.removeEventListener('error', errorHandler);
        worker.removeEventListener('message', messageHandler);
      }

      worker.addEventListener('error', rej);
      worker.addEventListener('message', messageHandler);
    });
  }

  // mapOver(arr, fn) {
  //   return arr.map(item => this.acquireAndRun(worker => fn(worker, item)));
  // }

  // async acquireAndRun(fn) {
  //   const { worker, release } = await this.acquire();
  //   const result = await fn(worker);
  //   release();

  //   return result;
  // }

  createWorker() {
    const worker = this.instantiator();

    queueMicrotask(() => this.dispatchWorkers());

    return worker;
  }

  releaser(worker: Worker) {
    this._pool.push(worker);

    const releaseResolver = this._releaseResolvers.get(worker);
    releaseResolver();

    debug('WorkerPool: dispatch released worker to new requests');
    this.dispatchWorkers();
  }

  dispatchWorkers() {
    while (this._queue.length > 0 && this._pool.length > 0) {
      const dispatcher = this._queue.shift()!;
      const worker = this._pool.shift()!;
      const acquisition = new Promise(res => this._releaseResolvers.set(worker, res));
      this._acquisitions.set(worker, acquisition);

      dispatcher.resolve({
        worker: worker,
        release: this.releaser.bind(this, worker)
      });
    }
  }
}
