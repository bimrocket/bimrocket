/**
 * RateLimiter.js
 *
 * @author realor
 */

class RateLimiter
{
  constructor(maxTasksPerSecond = 100, runInterval = 1000)
  {
    this.queue = [];
    this.maxTasksPerSecond = maxTasksPerSecond;
    this.runInterval = runInterval; // millis
    this.timer = null;
    this.running = false;
  }

  start()
  {
    if (this.running) return;

    this.running = true;
    this.timer = setInterval(() =>
    {
      if (!this.running) return;

      const maxTasks = Math.max(1,
        Math.floor(this.runInterval * this.maxTasksPerSecond / 1000));

      for (let i = 0; i < maxTasks && this.queue.length > 0; i++)
      {
        const task = this.queue.shift();
        task();
      }
    }, this.runInterval);
  }

  stop()
  {
    this.running = false;
    if (this.timer)
    {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  schedule(fn)
  {
    return new Promise((resolve, reject) =>
    {
      this.queue.push(() => fn().then(resolve).catch(reject));
    });
  }
}

export { RateLimiter };
