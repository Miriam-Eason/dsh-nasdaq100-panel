/**
 * Nasdaq-100 (NDX100) market data, Host side.
 *
 * Upstream: Eastmoney push2 quote + daily kline endpoints (delayed quotes, no key).
 * This module is pure Node/ESM: it fetches, caches, and derives the technical
 * metrics the browser dashboard renders. index.js only owns the HTTP route.
 */

const UPSTREAM_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

const SYMBOL = 'NDX100';
const INDEX_NAME_ZH = '纳斯达克100';
const SOURCE_NAME = '东方财富 Eastmoney';

/** NDX100 = the Nasdaq-100 index. (Eastmoney's `NDX` code is the Composite.) */
const QUOTE_URL =
  'https://push2.eastmoney.com/api/qt/stock/get?secid=100.NDX100' +
  '&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f86,f169,f170,f171';
const KLINE_URL =
  'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=100.NDX100&klt=101&fqt=1' +
  '&beg=19850101&end=20500101&fields1=f1,f2,f3,f4,f5,f6' +
  '&fields2=f51,f52,f53,f54,f55,f56,f59';
const MACRO_URL =
  'https://push2.eastmoney.com/api/qt/stock/get?secid=100.UDI&fields=f43,f58,f60,f170';

const QUOTE_TTL_MS = 20 * 1000;
const HISTORY_TTL_MS = 5 * 60 * 1000;
const MACRO_TTL_MS = 60 * 1000;

const RANGE_TRADING_DAYS = {
  '1m': 21,
  '3m': 63,
  '6m': 126,
  '1y': 252,
  '3y': 756,
  '5y': 1260,
};
const CHART_MAX_POINTS = 480;

/* ------------------------------------------------------------------ */
/* small utilities                                                      */
/* ------------------------------------------------------------------ */

function num(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Eastmoney price-style fields are integers scaled by 100. */
function price(value) {
  const n = num(value);
  return n === null ? null : Math.round(n) / 100;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function stdev(values) {
  const n = values.length;
  if (n < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

function ratio(current, base) {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) return null;
  return current / base - 1;
}

function toMs(dateText) {
  const ms = Date.parse(`${dateText}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

/* ------------------------------------------------------------------ */
/* upstream access + cache                                             */
/* ------------------------------------------------------------------ */

const cache = new Map(); // key -> { at, value }
const inflight = new Map(); // key -> Promise

async function fetchJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': UPSTREAM_UA,
        referer: 'https://quote.eastmoney.com/',
      },
    });
    if (!response.ok) throw new Error(`上游返回 HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function cached(key, ttlMs, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const pending = inflight.get(key);
  if (pending) return pending;
  const task = loader()
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, task);
  return task;
}

function parseQuote(json) {
  const data = json && json.data;
  if (!data) throw new Error('上游行情为空');
  const result = {
    price: price(data.f43),
    high: price(data.f44),
    low: price(data.f45),
    open: price(data.f46),
    volume: num(data.f47),
    prevClose: price(data.f60),
    change: price(data.f169),
    // Eastmoney reports the percent change scaled by 100: f170 = 68 means +0.68%.
    // Contract: changePct is in percentage points (0.68 = +0.68%), not a fraction.
    changePct: num(data.f170) === null ? null : num(data.f170) / 100,
    updatedAt: num(data.f86) === null ? null : num(data.f86) * 1000,
  };
  if (result.change === null && result.price !== null && result.prevClose !== null) {
    result.change = round(result.price - result.prevClose, 2);
  }
  if (result.changePct === null && result.change !== null && result.prevClose) {
    result.changePct = round((result.change / result.prevClose) * 100, 2);
  }
  return result;
}

function parseKline(json) {
  const data = json && json.data;
  const lines = data && Array.isArray(data.klines) ? data.klines : null;
  if (!lines || lines.length < 30) throw new Error('上游历史行情为空');
  const rows = [];
  for (const line of lines) {
    const parts = String(line).split(',');
    if (parts.length < 7) continue;
    const close = num(parts[2]);
    if (close === null || close <= 0) continue;
    rows.push({
      date: parts[0],
      open: num(parts[1]),
      close,
      high: num(parts[3]),
      low: num(parts[4]),
      volume: num(parts[5]) || 0,
      pct: num(parts[6]),
    });
  }
  if (rows.length < 30) throw new Error('可用的历史行情样本不足');
  return rows;
}

function getQuote() {
  return cached('quote', QUOTE_TTL_MS, async () => parseQuote(await fetchJson(QUOTE_URL)));
}

function getHistory() {
  return cached('history', HISTORY_TTL_MS, async () => parseKline(await fetchJson(KLINE_URL, 15000)));
}

function getMacro() {
  return cached('macro', MACRO_TTL_MS, async () => {
    const json = await fetchJson(MACRO_URL);
    const data = json && json.data;
    if (!data) return null;
    return {
      name: '美元指数',
      value: price(data.f43),
      // Percentage points, matching quote.changePct (f170 = -29 means -0.29%).
      changePct: num(data.f170) === null ? null : num(data.f170) / 100,
    };
  });
}

/* ------------------------------------------------------------------ */
/* technical metrics                                                    */
/* ------------------------------------------------------------------ */

function movingAverage(closes, period) {
  const out = new Array(closes.length).fill(null);
  let sum = 0;
  for (let i = 0; i < closes.length; i += 1) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function lastValue(values) {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (values[i] !== null) return values[i];
  }
  return null;
}

/** Wilder's RSI over the whole close series. */
function wilderRsi(closes, period = 14) {
  if (closes.length <= period) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function annualizedVol(closes, lookback) {
  if (closes.length <= lookback) return null;
  const returns = [];
  const start = closes.length - lookback;
  for (let i = start; i < closes.length; i += 1) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const sd = stdev(returns);
  return sd === null ? null : sd * Math.sqrt(252);
}

function maxDrawdown(closes) {
  let peak = -Infinity;
  let peakDate = null;
  let worst = { value: 0, start: null, end: null };
  for (let i = 0; i < closes.length; i += 1) {
    if (closes[i] > peak) {
      peak = closes[i];
      peakDate = i;
    }
    const dd = closes[i] / peak - 1;
    if (dd < worst.value) {
      worst = { value: dd, start: peakDate, end: i };
    }
  }
  return worst;
}

function findCross(maFast, maSlow, dates, lookback = 90) {
  const start = Math.max(1, maFast.length - lookback);
  for (let i = maFast.length - 1; i >= start; i -= 1) {
    if (maFast[i] === null || maSlow[i] === null || maFast[i - 1] === null || maSlow[i - 1] === null) continue;
    const before = maFast[i - 1] - maSlow[i - 1];
    const now = maFast[i] - maSlow[i];
    if (before <= 0 && now > 0) return { type: 'golden', date: dates[i] };
    if (before >= 0 && now < 0) return { type: 'death', date: dates[i] };
  }
  return { type: 'none', date: null };
}

function yearToDateReturn(rows) {
  const last = rows.length - 1;
  const year = rows[last].date.slice(0, 4);
  let start = rows.findIndex((row) => row.date.slice(0, 4) === year);
  if (start <= 0) return null;
  start -= 1; // last close before the current year
  return ratio(rows[last].close, rows[start].close);
}

function monthReturnSeasonality(rows) {
  const last = rows.length - 1;
  const monthKey = rows[last].date.slice(0, 7); // YYYY-MM
  const month = Number(rows[last].date.slice(5, 7));
  const closesByMonth = new Map();
  for (const row of rows) {
    closesByMonth.set(row.date.slice(0, 7), row.close); // last close of the month wins
  }
  const keys = [...closesByMonth.keys()].sort();
  const returns = [];
  for (let i = 1; i < keys.length; i += 1) {
    const key = keys[i];
    if (Number(key.slice(5, 7)) !== month) continue;
    returns.push(closesByMonth.get(key) / closesByMonth.get(keys[i - 1]) - 1);
  }
  if (!returns.length) return null;
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const wins = returns.filter((r) => r > 0).length;
  return {
    month,
    currentMonthKey: monthKey,
    avg,
    winRate: wins / returns.length,
    years: returns.length,
    best: Math.max(...returns),
    worst: Math.min(...returns),
  };
}

function marketStatus(nowMs) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hourCycle: 'h23',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = {};
    for (const part of formatter.formatToParts(new Date(nowMs))) parts[part.type] = part.value;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    if (weekday === 0 || weekday === 6) return 'closed';
    if (minutes >= 240 && minutes < 570) return 'pre';
    if (minutes >= 570 && minutes < 960) return 'open';
    if (minutes >= 960 && minutes < 1200) return 'post';
    return 'closed';
  } catch {
    return 'closed';
  }
}

/* ------------------------------------------------------------------ */
/* series for the chart                                                 */
/* ------------------------------------------------------------------ */

function buildSeries(dates, closes, ma50, startIndex) {
  const last = closes.length - 1;
  const count = last - startIndex + 1;
  const step = Math.max(1, Math.ceil(count / CHART_MAX_POINTS));
  const points = [];
  for (let i = startIndex; i <= last; i += step) {
    points.push([
      toMs(dates[i]),
      round(closes[i], 2),
      ma50[i] === null ? null : round(ma50[i], 2),
    ]);
  }
  if (points.length === 0 || points[points.length - 1][0] !== toMs(dates[last])) {
    points.push([
      toMs(dates[last]),
      round(closes[last], 2),
      ma50[last] === null ? null : round(ma50[last], 2),
    ]);
  }
  return {
    points,
    startDate: dates[startIndex],
    endDate: dates[last],
    sampled: step > 1,
    step,
  };
}

function rangeStartIndex(rows, range) {
  const last = rows.length - 1;
  if (range === 'max') return 0;
  if (range === 'ytd') {
    const year = rows[last].date.slice(0, 4);
    const first = rows.findIndex((row) => row.date.slice(0, 4) === year);
    return first <= 0 ? 0 : first - 1;
  }
  const days = RANGE_TRADING_DAYS[range] ?? RANGE_TRADING_DAYS['1y'];
  return Math.max(0, last - days);
}

/* ------------------------------------------------------------------ */
/* dashboard assembly                                                   */
/* ------------------------------------------------------------------ */

function metricsFor(rows) {
  const closes = rows.map((row) => row.close);
  const highs = rows.map((row) => row.high ?? row.close);
  const lows = rows.map((row) => row.low ?? row.close);
  const volumes = rows.map((row) => row.volume || 0);
  const dates = rows.map((row) => row.date);
  const last = rows.length - 1;

  const ma20 = movingAverage(closes, 20);
  const ma50 = movingAverage(closes, 50);
  const ma200 = movingAverage(closes, 200);

  const ma20Now = lastValue(ma20);
  const ma50Now = lastValue(ma50);
  const ma200Now = lastValue(ma200);
  const closeNow = closes[last];

  const window252 = closes.slice(Math.max(0, rows.length - 252));
  const highs252 = highs.slice(Math.max(0, rows.length - 252));
  const lows252 = lows.slice(Math.max(0, rows.length - 252));
  const high52 = Math.max(...highs252);
  const low52 = Math.min(...lows252);
  const high52Date = dates[dates.length - highs252.length + highs252.indexOf(high52)] ?? null;

  const ath = Math.max(...closes);
  const athIndex = closes.indexOf(ath);
  const ddAll = maxDrawdown(closes);
  const dd1y = maxDrawdown(window252);
  const offset1y = rows.length - window252.length;

  const avg20Volume =
    volumes.slice(Math.max(0, volumes.length - 20)).reduce((a, b) => a + b, 0) /
    Math.min(20, volumes.length);
  const avg5Volume =
    volumes.slice(Math.max(0, volumes.length - 5)).reduce((a, b) => a + b, 0) /
    Math.min(5, volumes.length);

  function ret(days) {
    if (rows.length - 1 - days < 0) return null;
    return ratio(closes[last], closes[last - days]);
  }

  const yearsOfHistory = rows.length / 252;
  const sinceInceptionAnnualized =
    rows.length > 252 && yearsOfHistory > 0
      ? (closes[last] / closes[0]) ** (1 / yearsOfHistory) - 1
      : null;

  const maAttitude = {
    above20: ma20Now === null ? null : closeNow > ma20Now,
    above50: ma50Now === null ? null : closeNow > ma50Now,
    above200: ma200Now === null ? null : closeNow > ma200Now,
    ma50AboveMa200: ma50Now !== null && ma200Now !== null ? ma50Now > ma200Now : null,
  };
  const cross = findCross(ma50, ma200, dates);

  let trendScore = 0;
  if (maAttitude.above20) trendScore += 1;
  else if (maAttitude.above20 === false) trendScore -= 1;
  if (maAttitude.above50) trendScore += 1;
  else if (maAttitude.above50 === false) trendScore -= 1;
  if (maAttitude.above200) trendScore += 1;
  else if (maAttitude.above200 === false) trendScore -= 1;
  if (maAttitude.ma50AboveMa200) trendScore += 1;
  else if (maAttitude.ma50AboveMa200 === false) trendScore -= 1;

  const returns = {
    d1: ret(1),
    w1: ret(5),
    m1: ret(21),
    m3: ret(63),
    m6: ret(126),
    ytd: yearToDateReturn(rows),
    y1: ret(252),
    y3: rows.length > 756 ? (closes[last] / closes[last - 756]) ** (1 / 3) - 1 : null,
    y5: rows.length > 1260 ? (closes[last] / closes[last - 1260]) ** (1 / 5) - 1 : null,
    sinceInceptionAnnualized,
  };

  const rsi14 = wilderRsi(closes, 14);
  const vol = {
    d20: annualizedVol(closes, 20),
    d60: annualizedVol(closes, 60),
  };

  return {
    asOf: dates[last],
    previousDate: dates[last - 1] ?? null,
    lastClose: closeNow,
    ma: {
      ma20: ma20Now,
      ma50: ma50Now,
      ma200: ma200Now,
      ...maAttitude,
      cross: cross.type,
      crossDate: cross.date,
    },
    returns,
    rsi14,
    volatility: vol,
    drawdown: {
      fromAth: ratio(closeNow, ath),
      ath: round(ath, 2),
      athDate: dates[athIndex],
      max1y: round(dd1y.value, 4),
      max1yStart: dd1y.start === null ? null : dates[offset1y + dd1y.start],
      max1yEnd: dd1y.end === null ? null : dates[offset1y + dd1y.end],
      maxAll: round(ddAll.value, 4),
      maxAllStart: ddAll.start === null ? null : dates[ddAll.start],
      maxAllEnd: ddAll.end === null ? null : dates[ddAll.end],
    },
    range52w: {
      high: round(high52, 2),
      low: round(low52, 2),
      highDate: high52Date,
      position: high52 > low52 ? (closeNow - low52) / (high52 - low52) : null,
      fromHigh: ratio(closeNow, high52),
      fromLow: ratio(closeNow, low52),
    },
    volume: {
      last: volumes[last] || null,
      avg20: round(avg20Volume, 0),
      avg5: round(avg5Volume, 0),
      ratio20: avg20Volume > 0 ? (volumes[last] || 0) / avg20Volume : null,
      trend5v20: avg20Volume > 0 ? avg5Volume / avg20Volume : null,
    },
    seasonality: monthReturnSeasonality(rows),
    trendScore,
    historyDays: rows.length,
    firstDate: dates[0],
  };
}

function synthesizeQuote(rows) {
  const last = rows.length - 1;
  const row = rows[last];
  const prev = rows[last - 1];
  return {
    price: row.close,
    open: row.open,
    high: row.high,
    low: row.low,
    prevClose: prev ? prev.close : null,
    change: prev ? round(row.close - prev.close, 2) : null,
    changePct: prev ? ratio(row.close, prev.close) : null,
    volume: row.volume || null,
    updatedAt: null,
    synthesized: true,
  };
}

function normalizeRange(range) {
  return Object.prototype.hasOwnProperty.call(RANGE_TRADING_DAYS, range) || range === 'max' || range === 'ytd'
    ? range
    : '1y';
}

/**
 * Build the dashboard payload served to the Client.
 * @param {string} requestedRange one of 1m,3m,6m,ytd,1y,3y,5y,max
 */
export async function buildDashboard(requestedRange = '1y') {
  const range = normalizeRange(requestedRange);
  const [historyResult, quoteResult, macroResult] = await Promise.allSettled([
    getHistory(),
    getQuote(),
    getMacro(),
  ]);

  if (historyResult.status === 'rejected') {
    const reason = historyResult.reason instanceof Error ? historyResult.reason.message : '未知错误';
    throw new Error(`历史行情获取失败：${reason}`);
  }
  const rows = historyResult.value;
  const dates = rows.map((row) => row.date);
  const closes = rows.map((row) => row.close);
  const ma50 = movingAverage(closes, 50);

  let quote;
  let quoteStale = false;
  if (quoteResult.status === 'fulfilled') {
    quote = quoteResult.value;
  } else {
    quote = synthesizeQuote(rows);
    quoteStale = true;
  }
  if (quote.price === null) {
    quote = synthesizeQuote(rows);
    quoteStale = true;
  }

  const startIndex = rangeStartIndex(rows, range);
  const series = buildSeries(dates, closes, ma50, startIndex);
  const metrics = metricsFor(rows);
  const macro = macroResult.status === 'fulfilled' ? macroResult.value : null;

  return {
    ok: true,
    symbol: SYMBOL,
    name: INDEX_NAME_ZH,
    source: SOURCE_NAME,
    range,
    asOf: metrics.asOf,
    fetchedAt: Date.now(),
    exchange: 'NASDAQ',
    marketStatus: marketStatus(Date.now()),
    quote: {
      ...quote,
      changePct: quote.changePct === null ? null : round(quote.changePct, 6),
    },
    macro,
    metrics,
    series,
    meta: {
      delayed: true,
      refreshSeconds: 60,
      quoteStale,
      historyDays: metrics.historyDays,
      firstDate: metrics.firstDate,
      timezone: 'America/New_York',
    },
  };
}

/** Lightweight route-level failure payload. */
export function errorPayload(error) {
  return {
    ok: false,
    error: {
      code: 'upstream_unavailable',
      message: error instanceof Error ? error.message : String(error),
    },
    fetchedAt: Date.now(),
  };
}
