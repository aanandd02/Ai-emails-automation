const statusBadge = document.getElementById("statusBadge");
const currentEmailEl = document.getElementById("currentEmail");
const liveStepEl = document.getElementById("liveStep");
const lastErrorEl = document.getElementById("lastError");
const logBox = document.getElementById("logBox");
const updatedAt = document.getElementById("updatedAt");
const sentListEl = document.getElementById("sentList");
const sentListCountEl = document.getElementById("sentListCount");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const progressTextEl = document.getElementById("progressText");
const progressPctEl = document.getElementById("progressPct");
const progressFillEl = document.getElementById("progressFill");
const remainingEl = document.getElementById("remaining");
const waitCountdownEl = document.getElementById("waitCountdown");

const statEls = {
  totalRows: document.getElementById("totalRows"),
  validUsers: document.getElementById("validUsers"),
  processed: document.getElementById("processed"),
  sent: document.getElementById("sent"),
  skipped: document.getElementById("skipped"),
  failed: document.getElementById("failed"),
};

let logs = [];
let sentItems = [];
let appState = {
  isRunning: false,
  stopRequested: false,
  currentEmail: "-",
  liveStep: "-",
  lastError: null,
  stats: {
    totalRows: 0,
    validUsers: 0,
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  },
  position: 0,
  total: 0,
  waitSeconds: null,
  isGenerating: false,
};

function formatTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString();
}

function setBadge(isRunning, stopRequested, hasError) {
  statusBadge.className = "badge";
  if (hasError) {
    statusBadge.textContent = "Error";
    statusBadge.classList.add("error");
    return;
  }

  if (isRunning && stopRequested) {
    statusBadge.textContent = "Stopping";
    statusBadge.classList.add("stopping");
    return;
  }

  if (isRunning) {
    statusBadge.textContent = "Running";
    statusBadge.classList.add("running");
    return;
  }

  statusBadge.textContent = "Idle";
  statusBadge.classList.add("idle");
}

function setStats(stats = {}) {
  for (const key of Object.keys(statEls)) {
    statEls[key].textContent = stats[key] ?? 0;
  }
}

function appendLog(event) {
  if (!event?.message) return;

  const message = event.message || "";
  const isWait = event.level === "wait" || event.stage === "waiting";
  const isPrepare = event.stage === "preparing" || message.includes("Preparing email for");
  const isGenerate = event.stage === "generating" || message.includes("Generating content for");
  const isSkip = message.startsWith("Skipping ") || message.startsWith("Skipped ");
  if (isWait || isPrepare || isGenerate || isSkip) {
    return;
  }

  const line = `[${formatTime(event.timestamp)}] ${event.message}`;
  logs.push(line);

  if (logs.length > 280) logs = logs.slice(-280);

  logBox.textContent = logs.join("\n");
  logBox.scrollTop = logBox.scrollHeight;
}

function renderSentList() {
  sentListCountEl.textContent = String(sentItems.length);
  sentListEl.innerHTML = "";

  if (sentItems.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No sent mail yet.";
    sentListEl.appendChild(item);
    return;
  }

  for (const itemData of sentItems) {
    const item = document.createElement("li");
    item.textContent = `[${formatTime(itemData.timestamp)}] ${itemData.email}`;
    sentListEl.appendChild(item);
  }
}

function addSentItemFromEvent(event) {
  let email = null;
  if (event?.message) {
    const match = event.message.match(/^Marked\s+(\S+)\s+as Sent/i);
    email = match?.[1] || null;
  }
  if (!email) return;

  const exists = sentItems.some((item) => item.email === email);
  if (exists) return;

  sentItems.unshift({
    email,
    timestamp: event.timestamp || new Date().toISOString(),
  });

  if (sentItems.length > 300) {
    sentItems = sentItems.slice(0, 300);
  }

  renderSentList();
}

function clearRunStreams() {
  logs = [];
  sentItems = [];
  logBox.textContent = "";
  renderSentList();
}

function computeProgress() {
  const total = appState.total || appState.stats.validUsers || 0;
  const processed = appState.stats.processed || 0;

  const pct = total > 0 ? Math.min(100, (processed / total) * 100) : 0;
  progressFillEl.style.width = `${pct.toFixed(1)}%`;
  progressPctEl.textContent = `${pct.toFixed(1)}%`;
  progressTextEl.textContent = `${processed} / ${total} processed`;

  const remaining = Math.max(total - processed, 0);
  remainingEl.textContent = String(remaining);
}

function applyStateToUi() {
  setStats(appState.stats);
  currentEmailEl.textContent = appState.currentEmail || "-";
  liveStepEl.textContent = appState.liveStep || "-";
  lastErrorEl.textContent = appState.lastError || "-";
  setBadge(appState.isRunning, appState.stopRequested, Boolean(appState.lastError));
  startBtn.disabled = appState.isRunning;
  stopBtn.disabled = !appState.isRunning;
  waitCountdownEl.textContent = appState.isGenerating
    ? "Generating..."
    : Number.isFinite(appState.waitSeconds) && appState.waitSeconds > 0
      ? `${appState.waitSeconds}s`
      : "--";
  computeProgress();
}

function applySnapshot(state) {
  appState = {
    ...appState,
    ...state,
    stats: state.stats || appState.stats,
    position: 0,
    total: state.stats?.validUsers || 0,
    waitSeconds: null,
    isGenerating: false,
  };

  clearRunStreams();
  for (const entry of state.recentLogs || []) {
    addSentItemFromEvent(entry);
    appendLog(entry);
  }

  applyStateToUi();
}

function consumeEvent(event) {
  if (event.stats) {
    appState.stats = event.stats;
  }

  if (event.currentEmail) {
    appState.currentEmail = event.currentEmail;
  }

  if (event.position) {
    appState.position = event.position;
  }

  if (event.total) {
    appState.total = event.total;
  }

  const liveTotal = appState.total || appState.stats.validUsers || 0;
  const livePos = appState.position || appState.stats.processed || 0;
  if (event.stage === "preparing" || event.message?.includes("Preparing email for")) {
    appState.liveStep = `${livePos}/${liveTotal} preparing`;
  } else if (event.stage === "generating" || event.message?.includes("Generating content for")) {
    appState.liveStep = `${livePos}/${liveTotal} generating`;
    appState.isGenerating = true;
    appState.waitSeconds = null;
  } else if (event.message?.startsWith("Skipping ") || event.message?.startsWith("Skipped ")) {
    appState.liveStep = `${livePos}/${liveTotal} skipped`;
  } else if (event.stage === "waiting" || event.level === "wait") {
    appState.liveStep = `${livePos}/${liveTotal} waiting`;
    appState.isGenerating = false;
  } else if (event.message?.startsWith("Marked ")) {
    appState.liveStep = `${livePos}/${liveTotal} sent`;
    appState.isGenerating = false;
  } else if (event.level === "error") {
    appState.liveStep = `${livePos}/${liveTotal} failed`;
    appState.isGenerating = false;
  }

  if (event.remainingSeconds !== undefined) {
    appState.waitSeconds = event.remainingSeconds;
  }

  if (event.level === "success" || event.message?.startsWith("Marked ")) {
    appState.waitSeconds = null;
  }

  if (event.phase === "error") {
    appState.lastError = event.message;
    appState.isRunning = false;
    appState.stopRequested = false;
  }

  if (event.phase === "running") {
    clearRunStreams();
    appState.lastError = null;
    appState.isRunning = true;
    appState.stopRequested = false;
    appState.isGenerating = false;
  }

  if (event.phase === "stopping") {
    appState.isRunning = true;
    appState.stopRequested = true;
  }

  if (event.phase === "stopped" || event.phase === "completed" || event.phase === "error") {
    appState.waitSeconds = null;
    appState.isGenerating = false;
    appState.isRunning = false;
    appState.stopRequested = false;
    if (event.phase === "completed") {
      appState.liveStep = `${appState.stats.processed}/${appState.total || appState.stats.validUsers} completed`;
    }
  }

  appendLog(event);
  addSentItemFromEvent(event);
  applyStateToUi();
}

async function post(url) {
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.reason || `Request failed: ${res.status}`);
  }
  return res.json();
}

startBtn.addEventListener("click", async () => {
  try {
    clearRunStreams();
    await post("/api/start");
  } catch (err) {
    appendLog({ timestamp: new Date().toISOString(), message: err.message });
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    await post("/api/stop");
  } catch (err) {
    appendLog({ timestamp: new Date().toISOString(), message: err.message });
  }
});

async function initialLoad() {
  const res = await fetch("/api/status");
  const state = await res.json();
  applySnapshot(state);
}

function connectEvents() {
  const stream = new EventSource("/api/events");

  stream.onmessage = (message) => {
    const event = JSON.parse(message.data);
    updatedAt.textContent = `Last update: ${formatTime(event.timestamp || new Date().toISOString())}`;

    if (event.type === "snapshot") {
      applySnapshot(event);
      return;
    }

    consumeEvent(event);

    if (event.type === "heartbeat") {
      fetch("/api/status")
        .then((res) => res.json())
        .then((state) => {
          appState = {
            ...appState,
            ...state,
            stats: state.stats || appState.stats,
          };
          applyStateToUi();
        })
        .catch(() => {});
    }
  };

  stream.onerror = () => {
    appendLog({
      timestamp: new Date().toISOString(),
      message: "Event stream disconnected, retrying...",
    });
  };
}

initialLoad().then(connectEvents).catch((error) => {
  appendLog({ timestamp: new Date().toISOString(), message: error.message });
});

renderSentList();
clearRunStreams();
