import { Router } from "express";
import { automationRunner } from "../runner/automationRunner.js";

const router = Router();

router.get("/status", (_req, res) => {
  res.json(automationRunner.getState());
});

router.post("/start", async (_req, res) => {
  const result = await automationRunner.start();
  if (!result.started) {
    res.status(409).json(result);
    return;
  }

  res.status(202).json(result);
});

router.post("/stop", (_req, res) => {
  const result = automationRunner.stop();
  if (!result.stopped) {
    res.status(409).json(result);
    return;
  }

  res.status(202).json(result);
});

router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  sendEvent({ type: "snapshot", ...automationRunner.getState() });

  const listener = (event) => sendEvent(event);
  automationRunner.on("update", listener);

  const keepAlive = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    automationRunner.off("update", listener);
    res.end();
  });
});

export default router;
