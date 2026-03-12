import { useCallback, useEffect, useMemo, useState } from "react";
import "./styles.css";

const envBase = (import.meta.env.VITE_API_BASE || "").trim();
const defaultBase = "http://localhost:3000";
const apiBase = (envBase || defaultBase).replace(/\/$/, "");

const initialState = {
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

const formatTime = (iso) => {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleTimeString();
};

const badgeClass = (state) => {
  if (state.lastError) return "badge error";
  if (state.isRunning && state.stopRequested) return "badge stopping";
  if (state.isRunning) return "badge running";
  return "badge idle";
};

function App() {
  const [appState, setAppState] = useState(initialState);
  const [logs, setLogs] = useState([]);
  const [sentItems, setSentItems] = useState([]);
  const [updatedAt, setUpdatedAt] = useState("Awaiting updates...");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(
    () => localStorage.getItem("authToken") || "",
  );
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const isAuthed = Boolean(token);

  const authorizedFetch = useCallback(
    (path, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      return fetch(`${apiBase}${path}`, { ...options, headers });
    },
    [token],
  );

  const progress = useMemo(() => {
    const total = appState.total || appState.stats.validUsers || 0;
    const processed = appState.stats.processed || 0;
    const pct = total > 0 ? Math.min(100, (processed / total) * 100) : 0;
    return {
      total,
      processed,
      remaining: Math.max(total - processed, 0),
      pct,
    };
  }, [appState.total, appState.stats.validUsers, appState.stats.processed]);

  const appendLog = useCallback((event) => {
    if (!event?.message) return;

    const message = event.message || "";
    const isWait = event.level === "wait" || event.stage === "waiting";
    const isPrepare =
      event.stage === "preparing" || message.includes("Preparing email for");
    const isGenerate =
      event.stage === "generating" ||
      message.includes("Generating content for");
    const isSkip =
      message.startsWith("Skipping ") || message.startsWith("Skipped ");
    if (isWait || isPrepare || isGenerate || isSkip) return;

    const line = `[${formatTime(event.timestamp || new Date().toISOString())}] ${message}`;
    setLogs((prev) => {
      const next = [...prev, line];
      return next.length > 280 ? next.slice(-280) : next;
    });
  }, []);

  const addSentItemFromEvent = useCallback((event) => {
    if (!event?.message) return;
    const match = event.message.match(/^Marked\s+(\S+)\s+as Sent/i);
    const email = match?.[1];
    if (!email) return;

    setSentItems((prev) => {
      if (prev.some((item) => item.email === email)) return prev;
      const next = [
        { email, timestamp: event.timestamp || new Date().toISOString() },
        ...prev,
      ];
      return next.length > 300 ? next.slice(0, 300) : next;
    });
  }, []);

  const applySnapshot = useCallback(
    (snapshot) => {
      setAppState((prev) => ({
        ...prev,
        ...snapshot,
        stats: snapshot.stats || prev.stats,
        position: 0,
        total: snapshot.stats?.validUsers || prev.total,
        waitSeconds: null,
        isGenerating: false,
        liveStep: snapshot.liveStep || "-",
        lastError: snapshot.lastError ?? null,
      }));

      setLogs(() => []);
      setSentItems(() => []);
      (snapshot.recentLogs || []).forEach((entry) => {
        addSentItemFromEvent(entry);
        appendLog(entry);
      });
    },
    [addSentItemFromEvent, appendLog],
  );

  const consumeEvent = useCallback(
    (event) => {
      setAppState((prev) => {
        const next = { ...prev };

        if (event.stats) next.stats = event.stats;
        if (event.currentEmail) next.currentEmail = event.currentEmail;
        if (event.position) next.position = event.position;
        if (event.total) next.total = event.total;

        const liveTotal = next.total || next.stats.validUsers || 0;
        const livePos = next.position || next.stats.processed || 0;
        if (
          event.stage === "preparing" ||
          event.message?.includes("Preparing email for")
        ) {
          next.liveStep = `${livePos}/${liveTotal} preparing`;
        } else if (
          event.stage === "generating" ||
          event.message?.includes("Generating content for")
        ) {
          next.liveStep = `${livePos}/${liveTotal} generating`;
          next.isGenerating = true;
          next.waitSeconds = null;
        } else if (
          event.message?.startsWith("Skipping ") ||
          event.message?.startsWith("Skipped ")
        ) {
          next.liveStep = `${livePos}/${liveTotal} skipped`;
        } else if (event.stage === "waiting" || event.level === "wait") {
          next.liveStep = `${livePos}/${liveTotal} waiting`;
          next.isGenerating = false;
        } else if (event.message?.startsWith("Marked ")) {
          next.liveStep = `${livePos}/${liveTotal} sent`;
          next.isGenerating = false;
        } else if (event.level === "error") {
          next.liveStep = `${livePos}/${liveTotal} failed`;
          next.isGenerating = false;
        }

        if (event.remainingSeconds !== undefined) {
          next.waitSeconds = event.remainingSeconds;
        }

        if (event.level === "success" || event.message?.startsWith("Marked ")) {
          next.waitSeconds = null;
        }

        if (event.phase === "error") {
          next.lastError = event.message;
          next.isRunning = false;
          next.stopRequested = false;
        }

        if (event.phase === "running") {
          next.lastError = null;
          next.isRunning = true;
          next.stopRequested = false;
          next.isGenerating = false;
        }

        if (event.phase === "stopping") {
          next.isRunning = true;
          next.stopRequested = true;
        }

        if (
          event.phase === "stopped" ||
          event.phase === "completed" ||
          event.phase === "error"
        ) {
          next.waitSeconds = null;
          next.isGenerating = false;
          next.isRunning = false;
          next.stopRequested = false;
          if (event.phase === "completed") {
            next.liveStep = `${next.stats.processed}/${next.total || next.stats.validUsers} completed`;
          }
        }

        return next;
      });

      appendLog(event);
      addSentItemFromEvent(event);
    },
    [addSentItemFromEvent, appendLog],
  );

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setUpdatedAt("Login required");
      setAppState(initialState);
      setLogs([]);
      setSentItems([]);
      return () => {
        cancelled = true;
      };
    }

    const loadInitial = async () => {
      try {
        const res = await authorizedFetch(`/api/status`);
        if (res.status === 401) {
          setAuthError("Session expired. Please login again.");
          setToken("");
          localStorage.removeItem("authToken");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        applySnapshot(data);
        setUpdatedAt(`Last update: ${formatTime(new Date().toISOString())}`);
      } catch (err) {
        appendLog({
          timestamp: new Date().toISOString(),
          message: err.message,
        });
      }
    };

    loadInitial();

    const stream = new EventSource(
      `${apiBase}/api/events?token=${encodeURIComponent(token)}`,
    );
    stream.onmessage = (message) => {
      if (cancelled) return;
      const event = JSON.parse(message.data);
      setUpdatedAt(
        `Last update: ${formatTime(event.timestamp || new Date().toISOString())}`,
      );

      if (event.type === "snapshot") {
        applySnapshot(event);
        return;
      }

      consumeEvent(event);

      if (event.type === "heartbeat") {
        authorizedFetch(`/api/status`)
          .then((res) => res.json())
          .then((state) => {
            if (cancelled) return;
            setAppState((prev) => ({
              ...prev,
              ...state,
              stats: state.stats || prev.stats,
            }));
          })
          .catch(() => {});
      }
    };

    stream.onerror = () => {
      if (cancelled) return;
      setAuthError("Event stream disconnected. Re-login if issue persists.");
      appendLog({
        timestamp: new Date().toISOString(),
        message: "Event stream disconnected, retrying...",
      });
    };

    return () => {
      cancelled = true;
      stream.close();
    };
  }, [appendLog, applySnapshot, consumeEvent, authorizedFetch, token]);

  const handleStart = async () => {
    try {
      setLogs(() => []);
      setSentItems(() => []);
      const res = await authorizedFetch(`/api/start`, { method: "POST" });
      if (res.status === 401) {
        setAuthError("Session expired. Please login again.");
        await handleLogout();
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to start automation");
      }
    } catch (err) {
      appendLog({ timestamp: new Date().toISOString(), message: err.message });
    }
  };

  const handleStop = async () => {
    try {
      const res = await authorizedFetch(`/api/stop`, { method: "POST" });
      if (res.status === 401) {
        setAuthError("Session expired. Please login again.");
        await handleLogout();
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to stop automation");
      }
    } catch (err) {
      appendLog({ timestamp: new Date().toISOString(), message: err.message });
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    setAuthError("");
    try {
      if (!apiBase) throw new Error("API not resolved yet");
      const res = await fetch(`${apiBase}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.status === 404)
        throw new Error(
          `API not reachable at "${apiBase}". Check backend URL/env.`,
        );
      if (res.status === 401) throw new Error("Invalid username or password");
      if (!res.ok) throw new Error("Login failed, try again.");
      const data = await res.json();
      setToken(data.token);
      localStorage.setItem("authToken", data.token);
      setPassword("");
    } catch (err) {
      setAuthError(err.message || "Login failed");
    }
  };

  const handleLogout = async () => {
    try {
      await authorizedFetch(`/api/logout`, { method: "POST" });
    } catch {
      // ignore logout failures
    } finally {
      setToken("");
      localStorage.removeItem("authToken");
    }
  };

  const waitLabel = appState.isGenerating
    ? "Generating..."
    : Number.isFinite(appState.waitSeconds) && appState.waitSeconds > 0
      ? `${appState.waitSeconds}s`
      : "--";

  if (!isAuthed) {
    return (
      <>
        <div className="bg-shape bg-shape-1" />
        <div className="bg-shape bg-shape-2" />
        <main className="auth-layout">
          <section className="auth-card">
            <p className="kicker">AI HR Mailer</p>
            <h1>Login Required</h1>
            <p className="subtitle">
              Enter your username and password to continue.
            </p>
            <form className="auth-form" onSubmit={handleLogin}>
              <label>
                <span>Username</span>
                <input
                  className="auth-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <div className="password-row">
                  <input
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="show-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              {authError && <div className="auth-error">{authError}</div>}
              <button className="btn btn-primary" type="submit">
                Login
              </button>
            </form>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <div className="bg-shape bg-shape-1" />
      <div className="bg-shape bg-shape-2" />

      <div className="page-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">AI</div>
            <div>
              <p className="eyebrow">AI HR Mailer</p>
              <h1>Automation Console</h1>
            </div>
          </div>
          <div className="session">
            <span
              className={`pill ${appState.isRunning ? "pill-live" : "pill-idle"}`}
            >
              {appState.isRunning ? "Live" : "Idle"}
            </span>
            {!showActivity && (
              <button
                className="pill pill-action"
                onClick={() => setShowActivity(true)}
              >
                Activity Feed
              </button>
            )}
            {showActivity && (
              <button
                className="pill pill-ghost"
                onClick={() => setShowActivity(false)}
              >
                Back to Dashboard
              </button>
            )}
            <button className="pill pill-ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className={`layout ${showActivity ? "feed-mode" : ""}`}>
          {!showActivity && (
            <>
              <section className="panel hero">
                <p className="kicker">Control</p>
                <h2>Run the email automations</h2>
                <p className="subtitle">
                  Start/stop ke saath live progress, queue health, aur wait
                  timer.
                </p>

                <div className="controls">
                  <button
                    className="btn btn-primary"
                    onClick={handleStart}
                    disabled={appState.isRunning}
                  >
                    Start Automation
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleStop}
                    disabled={!appState.isRunning}
                  >
                    Stop
                  </button>
                </div>

                <section className="progress-wrap">
                  <div className="progress-top">
                    <span className="mono">
                      {progress.processed} / {progress.total} processed
                    </span>
                    <span className="mono">{progress.pct.toFixed(1)}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${progress.pct.toFixed(1)}%` }}
                    />
                  </div>
                </section>

                <div className="quick-kpis">
                  <article>
                    <p>Remaining</p>
                    <strong>{progress.remaining}</strong>
                  </article>
                  <article>
                    <p>Wait Timer</p>
                    <strong>{waitLabel}</strong>
                  </article>
                  <article>
                    <p>Current Email</p>
                    <strong className="mono">
                      {appState.currentEmail || "-"}
                    </strong>
                  </article>
                  <article>
                    <p>Live Step</p>
                    <strong className="mono">{appState.liveStep || "-"}</strong>
                  </article>
                </div>

                <div className="status-row">
                  <span className="label">Status</span>
                  <span className={badgeClass(appState)}>
                    {appState.lastError
                      ? "Error"
                      : appState.isRunning
                        ? appState.stopRequested
                          ? "Stopping"
                          : "Running"
                        : "Idle"}
                  </span>
                </div>
                <div className="status-row">
                  <span className="label">Last Error</span>
                  <span className="mono">{appState.lastError || "-"}</span>
                </div>
              </section>

              <section className="panel stats">
                <div className="panel-head">
                  <h3>Run Snapshot</h3>
                  <span className="mono">{updatedAt}</span>
                </div>
                <div className="grid panel-content">
                  <article>
                    <p>Total Rows</p>
                    <strong>{appState.stats.totalRows}</strong>
                  </article>
                  <article>
                    <p>Valid Users</p>
                    <strong>{appState.stats.validUsers}</strong>
                  </article>
                  <article>
                    <p>Processed</p>
                    <strong>{appState.stats.processed}</strong>
                  </article>
                  <article>
                    <p>Sent</p>
                    <strong>{appState.stats.sent}</strong>
                  </article>
                  <article>
                    <p>Skipped</p>
                    <strong>{appState.stats.skipped}</strong>
                  </article>
                  <article>
                    <p>Failed</p>
                    <strong>{appState.stats.failed}</strong>
                  </article>
                </div>
              </section>
            </>
          )}

          {showActivity && (
            <section className="panel logs slide-in">
              <div className="logs-header">
                <h2>Activity Feed</h2>
                <span className="mono">{updatedAt}</span>
              </div>
              <div className="stream-grid panel-content">
                <pre className="log-box">
                  {logs.length ? logs.join("\n") : "No logs yet."}
                </pre>
                <section className="sent-stream">
                  <div className="sent-head">
                    <h3>Sent Mails (This Run)</h3>
                    <span className="mono">{sentItems.length}</span>
                  </div>
                  <ul className="sent-list">
                    {sentItems.length === 0 && <li>No sent mail yet.</li>}
                    {sentItems.map((item) => (
                      <li key={item.email + item.timestamp}>
                        [{formatTime(item.timestamp)}] {item.email}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}

export default App;
