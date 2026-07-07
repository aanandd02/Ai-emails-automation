import "dotenv/config";
import express from "express";
import cors from "cors";
import automationRoutes from "./src/routes/automationRoutes.js";
import logger from "./src/utils/logger.js";
import { loginHandler, logoutHandler, requireAuth } from "./src/middleware/auth.js";
import { automationRunner } from "./src/runner/automationRunner.js";


console.log("All imports done");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("App created");

// Frontend origin(s) allowed for CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());

// Protected automation APIs (Auth removed)
app.use("/api", automationRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "running", message: "AI Email Automation API is active", healthCheck: "/health" });
});

app.get("/health", (_req, res) => {
  res.send("ok");
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  logger.info(`API server running on http://localhost:${PORT}`);
});

// Keep event loop alive
setInterval(() => { }, 3600000);

// Self-ping to prevent Render free plan from sleeping DURING automation
// Only pings when automation is actually running (not 24/7)
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

setInterval(async () => {
  if (!automationRunner.isRunning) return; // Only ping when automation is active
  try {
    await fetch(`${RENDER_URL}/health`);
    logger.info("Self-ping: server kept awake during automation");
  } catch (err) {
    // Silent fail
  }
}, 10 * 60 * 1000); // Every 10 minutes


