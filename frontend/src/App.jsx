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
  waitSeconds: null,
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
    if (!event?.message) return;
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${event.message}`;
    setLogs((prev) => [line, ...prev].slice(0, 100));
  }, []);

  const addSentItem = useCallback((event) => {
    const match = event.message?.match(/Marked\s+(\S+)\s+as Sent/i);
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
        if (event.phase) {
          setAppState(prev => ({ ...prev, isRunning: event.phase === "running", stopRequested: event.phase === "stopping" }));
        }
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
            <div className="logo-icon">AI</div>
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
          <div className="logo-icon">AI</div>
          <div className="logo-text">
            <h1>HR Automation</h1>
            <p>Admin Control Center</p>
          </div>
        </div>
        <div className="header-actions">
          {!backendAlive && <span className="status-pill" style={{ background: 'rgba(244, 63, 94, 0.2)', color: 'var(--danger)' }}>Backend Offline</span>}
          <div className={`status-pill ${appState.isRunning ? 'status-running' : 'status-idle'}`}>
            {appState.isRunning ? 'Streaming Live' : 'System Idle'}
          </div>
          <button className="btn btn-danger" onClick={handleLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Logout</button>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="card main-control">
          <div className="section-title">
            <h2>Operation Control</h2>
            <div className="btn-group">
              <button 
                className="btn btn-primary" 
                onClick={startAutomation} 
                disabled={appState.isRunning}
              >
                ▶ Start Run
              </button>
              <button 
                className="btn btn-danger" 
                onClick={stopAutomation} 
                disabled={!appState.isRunning}
              >
                ■ Stop Run
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
              <span className="stat-value" style={{ fontSize: '1.2rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appState.currentEmail || "None"}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Wait Timer</span>
              <span className="stat-value" style={{ fontSize: '1.2rem' }}>{appState.waitSeconds ? `${appState.waitSeconds}s` : "--"}</span>
            </div>
          </div>
        </section>

        <section className="card stats-panel">
          <div className="section-title">
            <h2>Live Statistics</h2>
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
              <span className="stat-value" style={{ color: 'var(--danger)' }}>{appState.stats.failed}</span>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'right' }}>
            {updatedAt}
          </div>
        </section>

        <section className="card full-width">
          <div className="section-title">
            <h2>Activity & Logs</h2>
            <div className="btn-group">
               <button className={`btn ${viewMode === 'dashboard' ? 'btn-primary' : 'btn-danger'}`} onClick={() => setViewMode('dashboard')} style={{ padding: '0.4rem 1rem' }}>Console</button>
               <button className={`btn ${viewMode === 'activity' ? 'btn-primary' : 'btn-danger'}`} onClick={() => setViewMode('activity')} style={{ padding: '0.4rem 1rem' }}>Sent History</button>
            </div>
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
