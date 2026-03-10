/**
 * Tool handler for the "cron" tool — schedule/list/remove recurring tasks
 * Wraps CronScheduler from @disclaw/gateway
 * See: docs/disclaw/05-tools-skills-system.md § cron
 */

import type { ToolCall } from "@disclaw/types";
import type { CronScheduler } from "@disclaw/gateway";

export type ToolHandler = (toolCall: ToolCall) => Promise<string>;

interface CronToolDeps {
  cron: CronScheduler;
}

/** Create the cron tool handler bound to a CronScheduler instance */
export function createCronToolHandler(deps: CronToolDeps): ToolHandler {
  const { cron } = deps;

  return async (toolCall: ToolCall): Promise<string> => {
    const { action, schedule, taskName } = toolCall.input as {
      action: string;
      schedule?: string;
      taskName?: string;
    };

    try {
      switch (action) {
        case "add": {
          if (!schedule || !taskName) {
            return "Error: 'schedule' and 'taskName' are required for add.";
          }
          const id = `${taskName}-${Date.now()}`;
          cron.addJob({
            id,
            type: schedule.includes(" ") ? "cron" : "every",
            schedule,
            action: taskName,
            maxRetries: 3,
            nextRunAt: new Date().toISOString(),
          });
          return `Scheduled job '${taskName}' (id: ${id}) with schedule: ${schedule}`;
        }

        case "remove": {
          if (!taskName) {
            return "Error: 'taskName' is required for remove.";
          }
          // Find job by action name or id
          const jobs = cron.getJobs();
          const job = jobs.find((j) => j.id === taskName || j.action === taskName);
          if (!job) {
            return `Error: No job found matching '${taskName}'.`;
          }
          cron.removeJob(job.id);
          return `Removed job: ${job.id}`;
        }

        case "list": {
          const jobs = cron.getJobs();
          if (jobs.length === 0) {
            return "No scheduled jobs.";
          }
          const lines = jobs.map(
            (j) => `- ${j.id} | ${j.type}:${j.schedule} | status:${j.status} | next:${j.nextRunAt}`,
          );
          return lines.join("\n");
        }

        default:
          return `Error: Unknown action '${action}'. Use add, remove, or list.`;
      }
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  };
}
