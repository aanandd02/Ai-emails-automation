import { EventEmitter } from "events";

const LOG_LIMIT = 250;

class AutomationRunner extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.stopRequested = false;
    this.finishedAt = null;
    this.currentEmail = null;
    this.lastError = null;
    this.stats = {
      totalRows: 0,
      validUsers: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      processed: 0,
    };
    this.logs = [];
    this.waitSeconds = null;
  }

  getState() {
    return {
      isRunning: this.isRunning,
      stopRequested: this.stopRequested,
      finishedAt: this.finishedAt,
      currentEmail: this.currentEmail,
      lastError: this.lastError,
      stats: this.stats,
      recentLogs: this.logs,
      waitSeconds: this.waitSeconds,
    };
  }

  addLog(entry) {
    this.logs.push(entry);
    if (this.logs.length > LOG_LIMIT) {
      this.logs.shift();
    }
  }

  emitUpdate(type, payload) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    if (event.message) {
      this.addLog(event);
    }

    this.emit("update", event);
  }

  syncStateFromEvent(event) {
    if (event.stats) {
      this.stats = { ...event.stats };
    }

    if (event.currentEmail) {
      this.currentEmail = event.currentEmail;
    }

    if (event.remainingSeconds !== undefined) {
      this.waitSeconds = event.remainingSeconds;
    } else if (event.stage && event.stage !== "waiting") {
      this.waitSeconds = null;
    }

    if (event.type === "status") {
      if (event.phase === "error") {
        this.lastError = event.message;
      }
      if (
        event.phase === "stopped" ||
        event.phase === "completed" ||
        event.phase === "error"
      ) {
        this.finishedAt = new Date().toISOString();
      }
    }
  }

  async start() {
    if (this.isRunning) {
      return { started: false, reason: "Automation is already running" };
    }

    this.isRunning = true;
    this.stopRequested = false;
    this.finishedAt = null;
    this.currentEmail = null;
    this.lastError = null;
    this.stats = {
      totalRows: 0,
      validUsers: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      processed: 0,
    };
    this.logs = [];
    this.waitSeconds = null;

    this.emitUpdate("status", {
      phase: "running",
      level: "info",
      message: "Automation started",
      stats: this.stats,
    });

    const shouldStop = () => this.stopRequested;

    import("../controllers/emailController.js")
      .then(({ sendEmailsFromGoogleSheet }) =>
        sendEmailsFromGoogleSheet({
          shouldStop,
          onEvent: (event) => {
            this.syncStateFromEvent(event);
            this.emitUpdate(event.type ?? "progress", event);
          },
        }),
      )
      .then((result) => {
        if (!result?.stopped) {
          this.emitUpdate("status", {
            phase: "completed",
            level: "success",
            message: "Automation completed",
            stats: this.stats,
          });
        }
      })
      .catch((error) => {
        this.lastError = error.message;
        this.emitUpdate("status", {
          phase: "error",
          level: "error",
          message: `Automation crashed: ${error.message}`,
          stats: this.stats,
        });
      })
      .finally(() => {
        this.isRunning = false;
        this.stopRequested = false;
        this.finishedAt = new Date().toISOString();
        this.emitUpdate("heartbeat", {
          message: "Runner state updated",
          stats: this.stats,
        });
      });

    return { started: true };
  }

  stop() {
    if (!this.isRunning) {
      return { stopped: false, reason: "Automation is not running" };
    }

    this.stopRequested = true;
    this.emitUpdate("status", {
      phase: "stopping",
      level: "warn",
      message: "Stop requested. Finishing current safe step...",
      stats: this.stats,
    });

    return { stopped: true };
  }
}

export const automationRunner = new AutomationRunner();
