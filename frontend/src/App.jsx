import { useCallback, useEffect, useMemo, useState } from "react";
import "./styles.css";

// Handle API Base URL from Environment Variables
const apiBase = (import.meta.env.VITE_API_BASE || "http://localhost:3000").replace(/\/$/, "");

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
  targetTimestamp: null,
  isGenerating: false,
};

function App() {
  const [appState, setAppState] = useState(initialState);
  const [logs, setLogs] = useState([]);
  const [sentItems, setSentItems] = useState([]);
  const [updatedAt, setUpdatedAt] = useState("System Standby");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("authToken") || "");
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [viewMode, setViewMode] = useState("dashboard"); // dashboard | activity
  const [backendAlive, setBackendAlive] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [liveWaitSeconds, setLiveWaitSeconds] = useState(null);

  // Apply theme to body
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  const isAuthed = Boolean(token);

  // Initialize and check health
  useEffect(() => {
    let retryCount = 0;
    const checkHealth = async () => {
      try {
        const res = await fetch(`${apiBase}/health`);
        if (res.ok) {
          setIsInitializing(false);
          setBackendAlive(true);
        } else {
          throw new Error();
        }
      } catch (err) {
        retryCount++;
        // Keep retrying during cold start
        setTimeout(checkHealth, 2000);
      }
    };
    checkHealth();
  }, []);

  const authorizedFetch = useCallback(
    (path, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      return fetch(`${apiBase}${path}`, { ...options, headers });
    },
    [token]
  );

  const progress = useMemo(() => {
    const total = appState.total || appState.stats.validUsers || 0;
    const processed = appState.stats.processed || 0;
    const pct = total > 0 ? Math.min(100, (processed / total) * 100) : 0;
    return { total, processed, pct };
  }, [appState]);

  const appendLog = useCallback((event) => {
    if (!event?.message || event.level === "wait") return;
    const date = event.timestamp ? new Date(event.timestamp) : new Date();
    const time = date.toLocaleTimeString();
    const line = `[${time}] ${event.message}`;
    setLogs((prev) => [line, ...prev].slice(0, 100));
  }, []);

  const addSentItem = useCallback((event) => {
    const match = event.message?.match(/Successfully\s+dispatched\s+to\s+(\S+)/i);
    if (match?.[1]) {
      setSentItems((prev) => [{ email: match[1], time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    }
  }, []);

  // Sync state from backend
  useEffect(() => {
    if (!isAuthed) return;

    const checkStatus = async () => {
      try {
        const res = await authorizedFetch("/api/status");
        if (res.status === 401) {
          handleLogout();
          return;
        }
        const data = await res.json();
        setAppState(prev => ({ ...prev, ...data }));
        setBackendAlive(true);
      } catch (err) {
        setBackendAlive(false);
      }
    };

    checkStatus();
    const timer = setInterval(checkStatus, 5000);
    return () => clearInterval(timer);
  }, [isAuthed, authorizedFetch]);

  // Smooth Frontend Countdown (Isolated)
  useEffect(() => {
    if (!appState.isRunning || !appState.targetTimestamp) {
      setLiveWaitSeconds(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((appState.targetTimestamp - now) / 1000));
      setLiveWaitSeconds(remaining > 0 ? remaining : null);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);

    return () => clearInterval(interval);
  }, [appState.isRunning, appState.targetTimestamp]);

  // Event Stream (SSE)
  useEffect(() => {
    if (!isAuthed) return;

    const stream = new EventSource(`${apiBase}/api/events?token=${encodeURIComponent(token)}`);
    
    stream.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setUpdatedAt(`Updated: ${new Date().toLocaleTimeString()}`);
      
      if (event.type === "snapshot") {
        setAppState(prev => ({ ...prev, ...event }));
      } else {
        appendLog(event);
        addSentItem(event);

        setAppState(prev => {
          const newState = { ...prev };
          if (event.stats) newState.stats = { ...event.stats };
          if (event.currentEmail) newState.currentEmail = event.currentEmail;
          if (event.position) newState.position = event.position;
          if (event.total) newState.total = event.total;

          if (event.targetTimestamp) {
            newState.targetTimestamp = event.targetTimestamp;
          } else if (event.stage && event.stage !== "waiting") {
            newState.targetTimestamp = null;
          }

          if (event.phase) {
            newState.isRunning = event.phase === "running";
            newState.stopRequested = event.phase === "stopping";
          }
          return newState;
        });
      }
    };

    stream.onerror = () => {
      console.error("Stream disconnected");
    };

    return () => stream.close();
  }, [isAuthed, token, appendLog, addSentItem]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${apiBase}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.status === 401) throw new Error("Invalid credentials");
      const data = await res.json();
      setToken(data.token);
      localStorage.setItem("authToken", data.token);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("authToken");
  };

  const startAutomation = () => authorizedFetch("/api/start", { method: "POST" });
  const stopAutomation = () => authorizedFetch("/api/stop", { method: "POST" });

  if (isInitializing) {
    return (
      <div className="system-loader">
        <div className="loader-content">
          <div className="loader-spinner"></div>
          <div className="loader-text">
            <h2>Initializing Systems</h2>
            <p>Waking up Neural Engine... {backendAlive ? "Syncing" : "Waiting for Cloud"}</p>
          </div>
          <div className="loader-progress">
             <div className="loader-progress-inner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="auth-wrapper fade-in">
        <div className="glow-container">
          <div className="glow-circle glow-1"></div>
          <div className="glow-circle glow-2"></div>
        </div>
        <main className="card auth-card">
          <div className="logo-section">
            <div className="logo-icon">
              <img src="/logo.png" alt="AI HR Automation Logo" className="logo-img" />
            </div>
            <div className="logo-text">
              <h1>HR Mailer</h1>
              <p>Authentication Required</p>
            </div>
          </div>
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {authError && <div className="error-bg">{authError}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Login to Console</button>
            <div className="auth-footer">
               <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.8rem' }}>
                  {showPassword ? "Hide" : "Show"} Password
               </button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container fade-in">
      <div className="glow-container">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>

      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <img src="/logo.png" alt="AI HR Automation Logo" className="logo-img" />
          </div>
          <div className="logo-text">
            <h1>HR Mailer</h1>
          </div>
        </div>
        <div className="header-actions">
          {!backendAlive && <span className="status-pill status-offline">Offline</span>}
          
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
            {theme === "dark" ? "☼" : "☾"}
          </button>

          <div className={`status-pill ${appState.isRunning ? 'status-running' : 'status-idle'}`}>
            <span className="status-dot"></span>
            <span className="status-label">{appState.isRunning ? 'Live' : 'Idle'}</span>
          </div>
          
          <button className="btn btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="card main-control">
          <div className="section-title">
            <h2>Command Console</h2>
          </div>
          
          <div className="control-row">
            <div className="btn-group">
              <button 
                className="btn btn-primary" 
                onClick={startAutomation} 
                disabled={appState.isRunning}
              >
                Start Session
              </button>
              <button 
                className="btn btn-danger" 
                onClick={stopAutomation} 
                disabled={!appState.isRunning}
              >
                Stop Session
              </button>
            </div>
          </div>

          <div className="progress-container">
            <div className="progress-info">
              <span>Overall Progress</span>
              <span>{progress.processed} / {progress.total} Emails ({progress.pct.toFixed(1)}%)</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress.pct}%` }}></div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginTop: '2rem' }}>
            <div className="stat-item">
              <span className="stat-label">Current Target</span>
              <span className="stat-value email-value">{appState.currentEmail || "None"}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Wait Timer</span>
              <span className={`stat-value ${!liveWaitSeconds && appState.isRunning ? 'status-text' : ''}`}>
                {liveWaitSeconds ? `${liveWaitSeconds}s` : (appState.isRunning ? "Generating..." : "--")}
              </span>
            </div>
          </div>
        </section>

        <section className="card stats-panel">
          <div className="section-title">
            <h2>Real-time Stats</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Sent</span>
              <span className="stat-value">{appState.stats.sent}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pending</span>
              <span className="stat-value">{progress.total - progress.processed}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Skipped</span>
              <span className="stat-value">{appState.stats.skipped}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Failed</span>
              <span className="stat-value danger">{appState.stats.failed}</span>
            </div>
          </div>
          <div className="updated-at">
            {updatedAt}
          </div>
        </section>

        <section className="card full-width">
          <div className="section-title">
            <h2>Activity Stream</h2>
          </div>
          <div className="activity-feed">
            <div className="log-viewer">
              {logs.length > 0 ? logs.map((log, i) => <div key={i} style={{ marginBottom: '4px' }}>{log}</div>) : "Awaiting input..."}
            </div>
            <div className="sent-list">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Recent Success</h3>
              {sentItems.length > 0 ? sentItems.map((item, i) => (
                <div key={i} className="sent-item">
                  <span>{item.email}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>{item.time}</span>
                </div>
              )) : "No emails sent in this session."}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
