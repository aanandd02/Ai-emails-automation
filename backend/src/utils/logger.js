const shouldLog = process.env.LOG_TO_CONSOLE === "true";

export function info(...args) {
  if (shouldLog) {
    console.log(...args);
  }
}

export function warn(...args) {
  if (shouldLog) {
    console.warn(...args);
  }
}

export function error(...args) {
  if (shouldLog) {
    console.error(...args);
  }
}

export default { info, warn, error };
