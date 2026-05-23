class Queue {
  constructor() {
    this.tasks = [];
    this.processing = false;
  }

  add(fn) {
    return new Promise((resolve, reject) => {
      this.tasks.push({ fn, resolve, reject });
      if (!this.processing) this._process();
    });
  }

  async _process() {
    this.processing = true;
    while (this.tasks.length > 0) {
      const { fn, resolve, reject } = this.tasks.shift();
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
      await sleep(getRandomDelay());
    }
    this.processing = false;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getRandomDelay() {
  return Math.floor(Math.random() * 1500) + 500;
}

export const messageQueue = new Queue();
