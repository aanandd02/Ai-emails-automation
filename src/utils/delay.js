// src/utils/delay.js
/**
 * Delay execution for a given time (in ms).
 * @param {number} ms - milliseconds to wait
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
