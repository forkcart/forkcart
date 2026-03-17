import cron, { type ScheduledTask as CronTask } from 'node-cron';
import { createLogger } from '../lib/logger';
import type { PluginLoader } from './plugin-loader';

const logger = createLogger('plugin-scheduler');

interface TaskState {
  key: string;
  pluginName: string;
  taskName: string;
  schedule: string;
  enabled: boolean;
  lastRun: Date | null;
  lastError: string | null;
  runCount: number;
  cronJob: CronTask | null;
}

/**
 * Plugin Scheduler — manages cron jobs for plugin scheduled tasks.
 * - Loads tasks from PluginLoader at startup
 * - Parses cron expressions via node-cron
 * - Executes tasks at scheduled times
 * - Provides APIs for manual run, enable/disable
 */
export class PluginScheduler {
  private tasks = new Map<string, TaskState>();
  private started = false;

  constructor(private readonly pluginLoader: PluginLoader) {}

  /**
   * Start the scheduler — load all tasks and schedule them.
   * Call this after plugins have been loaded.
   */
  async start(): Promise<void> {
    if (this.started) {
      logger.warn('Scheduler already started');
      return;
    }

    logger.info('Starting plugin scheduler...');

    const registeredTasks = this.pluginLoader.getAllScheduledTasks();

    for (const { key, pluginName, task } of registeredTasks) {
      const state: TaskState = {
        key,
        pluginName,
        taskName: task.name,
        schedule: task.schedule,
        enabled: task.enabled !== false, // Default enabled
        lastRun: null,
        lastError: null,
        runCount: 0,
        cronJob: null,
      };

      this.tasks.set(key, state);

      if (state.enabled) {
        this.scheduleTask(state);
      }
    }

    this.started = true;
    logger.info({ taskCount: this.tasks.size }, 'Plugin scheduler started');
  }

  /**
   * Stop the scheduler — cancel all cron jobs.
   * Call this during graceful shutdown.
   */
  stop(): void {
    logger.info('Stopping plugin scheduler...');

    for (const state of this.tasks.values()) {
      if (state.cronJob) {
        state.cronJob.stop();
        state.cronJob = null;
      }
    }

    this.tasks.clear();
    this.started = false;
    logger.info('Plugin scheduler stopped');
  }

  /**
   * Refresh tasks — re-load from PluginLoader.
   * Call this after a plugin is activated/deactivated.
   */
  async refresh(): Promise<void> {
    // Stop existing jobs for tasks that are no longer registered
    const currentKeys = new Set(this.tasks.keys());
    const registeredTasks = this.pluginLoader.getAllScheduledTasks();
    const registeredKeys = new Set(registeredTasks.map((t) => t.key));

    // Remove tasks that are no longer registered
    for (const key of currentKeys) {
      if (!registeredKeys.has(key)) {
        const state = this.tasks.get(key);
        if (state?.cronJob) {
          state.cronJob.stop();
        }
        this.tasks.delete(key);
        logger.debug({ key }, 'Removed unregistered task');
      }
    }

    // Add new tasks
    for (const { key, pluginName, task } of registeredTasks) {
      if (!this.tasks.has(key)) {
        const state: TaskState = {
          key,
          pluginName,
          taskName: task.name,
          schedule: task.schedule,
          enabled: task.enabled !== false,
          lastRun: null,
          lastError: null,
          runCount: 0,
          cronJob: null,
        };

        this.tasks.set(key, state);

        if (state.enabled) {
          this.scheduleTask(state);
        }

        logger.debug({ key, pluginName }, 'Added new task');
      }
    }
  }

  /**
   * Schedule a task using node-cron.
   */
  private scheduleTask(state: TaskState): void {
    if (state.cronJob) {
      state.cronJob.stop();
    }

    // Validate cron expression
    if (!cron.validate(state.schedule)) {
      logger.error({ key: state.key, schedule: state.schedule }, 'Invalid cron expression');
      state.lastError = `Invalid cron expression: ${state.schedule}`;
      return;
    }

    state.cronJob = cron.schedule(state.schedule, async () => {
      await this.executeTask(state);
    });

    logger.debug({ key: state.key, schedule: state.schedule }, 'Task scheduled');
  }

  /**
   * Execute a task.
   */
  private async executeTask(state: TaskState): Promise<void> {
    const startTime = Date.now();
    logger.info({ key: state.key, pluginName: state.pluginName }, 'Executing scheduled task');

    try {
      await this.pluginLoader.runScheduledTask(state.key);

      state.lastRun = new Date();
      state.lastError = null;
      state.runCount++;

      const durationMs = Date.now() - startTime;
      logger.info(
        { key: state.key, pluginName: state.pluginName, durationMs },
        'Scheduled task completed',
      );
    } catch (error) {
      state.lastRun = new Date();
      state.lastError = error instanceof Error ? error.message : String(error);
      state.runCount++;

      logger.error(
        { key: state.key, pluginName: state.pluginName, error: state.lastError },
        'Scheduled task failed',
      );
    }
  }

  /**
   * Get all tasks with their current state.
   */
  getAllTasks(): Array<{
    key: string;
    pluginName: string;
    taskName: string;
    schedule: string;
    enabled: boolean;
    lastRun: Date | null;
    lastError: string | null;
    runCount: number;
  }> {
    return [...this.tasks.values()].map((state) => ({
      key: state.key,
      pluginName: state.pluginName,
      taskName: state.taskName,
      schedule: state.schedule,
      enabled: state.enabled,
      lastRun: state.lastRun,
      lastError: state.lastError,
      runCount: state.runCount,
    }));
  }

  /**
   * Get a specific task's state.
   */
  getTask(taskKey: string): ReturnType<PluginScheduler['getAllTasks']>[0] | null {
    const state = this.tasks.get(taskKey);
    if (!state) return null;

    return {
      key: state.key,
      pluginName: state.pluginName,
      taskName: state.taskName,
      schedule: state.schedule,
      enabled: state.enabled,
      lastRun: state.lastRun,
      lastError: state.lastError,
      runCount: state.runCount,
    };
  }

  /**
   * Manually run a task.
   */
  async runTask(taskKey: string): Promise<void> {
    const state = this.tasks.get(taskKey);
    if (!state) {
      throw new Error(`Task not found: ${taskKey}`);
    }

    await this.executeTask(state);
  }

  /**
   * Enable or disable a task.
   */
  toggleTask(taskKey: string, enabled: boolean): void {
    const state = this.tasks.get(taskKey);
    if (!state) {
      throw new Error(`Task not found: ${taskKey}`);
    }

    state.enabled = enabled;

    if (enabled) {
      this.scheduleTask(state);
      logger.info({ key: taskKey }, 'Task enabled');
    } else {
      if (state.cronJob) {
        state.cronJob.stop();
        state.cronJob = null;
      }
      logger.info({ key: taskKey }, 'Task disabled');
    }
  }
}
