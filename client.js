/**
 * Client half of the Nasdaq-100 panel bundle (plain browser JavaScript).
 *
 * Registers one sidebar panel icon and the matching central main-panel page.
 * Data comes from this package's Host half through the same-origin route
 * `/dsh-nasdaq100/data`; no direct third-party fetch happens in the browser.
 */
window.__ModuleLoader__.load({
  id: '@local/nasdaq100-panel',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useMemo, useRef } = React;

    const NS = 'nasdaq100';
    const RANGES = ['1m', '3m', '6m', 'ytd', '1y', '3y', '5y', 'max'];
    const STORAGE_KEY = 'dsh.nasdaq100.autoRefresh';

    /* ---------------------------------------------------------------- */
    /* locale dictionaries                                              */
    /* ---------------------------------------------------------------- */

    const ZH = {
      'panel.title': '纳斯达克100',
      'page.title': '纳斯达克100指数',
      'page.subtitle': '最新行情、历史走势与指标解读',
      'status.pre': '盘前',
      'status.open': '盘中',
      'status.post': '盘后',
      'status.closed': '休市',
      'updated.asof': '数据截至',
      'updated.local': '更新于',
      'actions.refresh': '刷新',
      'actions.autoOn': '自动刷新：开',
      'actions.autoOff': '自动刷新：关',
      'range.1m': '1月',
      'range.3m': '3月',
      'range.6m': '6月',
      'range.ytd': '今年',
      'range.1y': '1年',
      'range.3y': '3年',
      'range.5y': '5年',
      'range.max': '全部',
      loading: '正在获取纳斯达克100行情…',
      refreshing: '刷新中…',
      'refreshing.failed': '刷新失败，显示上次数据',
      'error.title': '行情加载失败',
      'error.retry': '重试',
      'error.hint': '请确认本机可访问 data 接口（东方财富行情源），稍后重试。',
      'quote.open': '今开',
      'quote.high': '最高',
      'quote.low': '最低',
      'quote.prevClose': '昨收',
      'quote.volume': '成交量',
      'quote.week52': '52周区间',
      'chart.legend.close': '收盘价',
      'chart.legend.ma': 'MA50',
      'chart.empty': '暂无图表数据',
      'chart.rangeReturn': '区间涨跌幅',
      'chart.sinceStart': '自',
      'summary.title': '综合解读',
      'insight.trend.title': '趋势',
      'insight.momentum.title': '动能',
      'insight.returns.title': '收益',
      'insight.volatility.title': '波动率',
      'insight.drawdown.title': '回撤',
      'insight.range.title': '52周区间',
      'insight.volume.title': '成交量',
      'insight.seasonality.title': '季节效应',
      'insight.macro.title': '宏观参考',
      'signal.strongUp': '强势上行',
      'signal.up': '偏多',
      'signal.neutral': '中性',
      'signal.down': '偏空',
      'signal.strongDown': '弱势下行',
      'rsi.overbought': '超买',
      'rsi.strong': '偏强',
      'rsi.neutral': '中性',
      'rsi.weak': '偏弱',
      'rsi.oversold': '超卖',
      'signal.riskLow': '低波动',
      'signal.riskNormal': '波动正常',
      'signal.riskElevated': '波动偏高',
      'signal.riskHigh': '高波动',
      'signal.nearHigh': '接近高点',
      'signal.midRange': '区间中部',
      'signal.nearLow': '接近低点',
      'signal.volumeUp': '放量',
      'signal.volumeDown': '缩量',
      'signal.volumeNormal': '量能平稳',
      'signal.seasonPositive': '季节性偏正',
      'signal.seasonNegative': '季节性偏负',
      'value.aboveMa50': '位于 MA50 上方',
      'value.belowMa50': '位于 MA50 下方',
      'punct.sep': '；',
      'trend.f.above20': '站上20日均线',
      'trend.f.below20': '处于20日均线下方',
      'trend.f.above50': '站上50日均线',
      'trend.f.below50': '处于50日均线下方',
      'trend.f.above200': '位于200日均线上方',
      'trend.f.below200': '位于200日均线下方',
      'trend.f.golden': '50日均线上穿200日均线形成金叉，中期结构改善',
      'trend.f.death': '50日均线下穿200日均线形成死叉，中期结构转弱',
      'trend.f.noCross': '50日与200日均线近期未出现新的交叉信号',
      'momentum.f.overbought': 'RSI 高于70，短线过热，回调风险上升',
      'momentum.f.strong': 'RSI 处于强势区，买盘动能占优',
      'momentum.f.neutral': 'RSI 位于中性区间，多空力量相对均衡',
      'momentum.f.weak': 'RSI 偏弱，短线反弹动能不足',
      'momentum.f.oversold': 'RSI 低于30，处于超卖区，存在技术性反弹可能',
      'returns.f.positive': '近一年录得正收益，趋势性行情仍占主导',
      'returns.f.negative': '近一年收益为负，指数仍处修复或调整阶段',
      'vol.f.low': '波动率处于低位，市场情绪相对平稳',
      'vol.f.normal': '波动率处于常态区间',
      'vol.f.elevated': '波动率偏高，短期回撤风险上升',
      'vol.f.high': '波动率处于高位，注意仓位与风险控制',
      'vol.f.rising': '20日波动率高于60日，波动正在放大',
      'vol.f.falling': '20日波动率低于60日，波动正在收敛',
      'dd.f.nearHigh': '距离历史高点很近，趋势健康，但追高需谨慎',
      'dd.f.moderate': '处于正常回撤区间，尚未破坏中期结构',
      'dd.f.deep': '回撤幅度较深，关注能否在关键均线附近企稳',
      'range.f.nearHigh': '位于52周区间上沿附近，强势特征明显',
      'range.f.mid': '位于52周区间中部，方向选择仍需确认',
      'range.f.nearLow': '位于52周区间下沿附近，弱势特征明显',
      'volume.f.up': '成交量高于20日均量，资金参与度提升',
      'volume.f.down': '成交量低于20日均量，观望情绪较浓',
      'volume.f.normal': '成交量接近20日均量，量能平稳',
      'season.f.positive': '历史同月平均上涨，季节性偏向正面（样本有限，仅供参考）',
      'season.f.negative': '历史同月平均下跌，季节性偏向负面（样本有限，仅供参考）',
      'macro.f.up': '美元走强通常对科技成长股估值形成压力',
      'macro.f.down': '美元走弱通常对科技成长股估值形成支撑',
      'row.ma20': 'MA20',
      'row.ma50': 'MA50',
      'row.ma200': 'MA200',
      'row.maStructure': '均线结构',
      'row.above': '多头排列',
      'row.below': '空头排列',
      'row.rsi14': 'RSI(14)',
      'row.ret1m': '近1月',
      'row.ret3m': '近3月',
      'row.ret6m': '近6月',
      'row.ytd': '今年以来',
      'row.ret1y': '近1年',
      'row.ret3yAnn': '近3年（年化）',
      'row.ret5yAnn': '近5年（年化）',
      'row.vol20': '20日年化波动率',
      'row.vol60': '60日年化波动率',
      'row.ddFromAth': '距历史最高点',
      'row.ath': '历史最高收盘',
      'row.ddMaxAll': '历史最大回撤',
      'row.ddMax1y': '近一年最大回撤',
      'row.high52': '52周最高',
      'row.low52': '52周最低',
      'row.pos52': '当前位置',
      'row.volLast': '最新成交量',
      'row.volAvg20': '20日均量',
      'row.volRatio': '量比（对20日均量）',
      'row.vol5v20': '5日均量 / 20日均量',
      'row.seasonMonth': '当前月份',
      'row.seasonAvg': '历史平均月收益',
      'row.seasonWin': '上涨概率',
      'row.seasonYears': '样本年数',
      'row.dxy': '美元指数',
      'row.dxyChange': '日变动',
      'footer.source': '数据来源：东方财富（延迟行情）。',
      'footer.basis': '趋势、动能、波动率、回撤、量能等指标基于日线收盘价计算。',
      'footer.disclaimer': '本面板仅供研究参考，不构成任何投资建议。',
      'footer.history': '历史数据起始于',
      'value.none': '—',
    };

    const EN = {
      'panel.title': 'Nasdaq 100',
      'page.title': 'Nasdaq 100 Index',
      'page.subtitle': 'Live quote, price history and plain-language metric interpretation',
      'status.pre': 'Pre-market',
      'status.open': 'Open',
      'status.post': 'After hours',
      'status.closed': 'Closed',
      'updated.asof': 'As of',
      'updated.local': 'Updated',
      'actions.refresh': 'Refresh',
      'actions.autoOn': 'Auto refresh: on',
      'actions.autoOff': 'Auto refresh: off',
      'range.1m': '1M',
      'range.3m': '3M',
      'range.6m': '6M',
      'range.ytd': 'YTD',
      'range.1y': '1Y',
      'range.3y': '3Y',
      'range.5y': '5Y',
      'range.max': 'MAX',
      loading: 'Loading Nasdaq-100 market data…',
      refreshing: 'Refreshing…',
      'refreshing.failed': 'Refresh failed — showing last data',
      'error.title': 'Could not load market data',
      'error.retry': 'Retry',
      'error.hint': 'The panel needs the local data route backed by the Eastmoney market feed. Try again shortly.',
      'quote.open': 'Open',
      'quote.high': 'High',
      'quote.low': 'Low',
      'quote.prevClose': 'Prev close',
      'quote.volume': 'Volume',
      'quote.week52': '52-week range',
      'chart.legend.close': 'Close',
      'chart.legend.ma': 'MA50',
      'chart.empty': 'No chart data',
      'chart.rangeReturn': 'Change since start',
      'chart.sinceStart': 'Since',
      'summary.title': 'Overall read',
      'insight.trend.title': 'Trend',
      'insight.momentum.title': 'Momentum',
      'insight.returns.title': 'Returns',
      'insight.volatility.title': 'Volatility',
      'insight.drawdown.title': 'Drawdown',
      'insight.range.title': '52-week range',
      'insight.volume.title': 'Volume',
      'insight.seasonality.title': 'Seasonality',
      'insight.macro.title': 'Macro context',
      'signal.strongUp': 'Strong uptrend',
      'signal.up': 'Uptrend',
      'signal.neutral': 'Neutral',
      'signal.down': 'Downtrend',
      'signal.strongDown': 'Strong downtrend',
      'rsi.overbought': 'Overbought',
      'rsi.strong': 'Strong',
      'rsi.neutral': 'Neutral',
      'rsi.weak': 'Weak',
      'rsi.oversold': 'Oversold',
      'signal.riskLow': 'Low volatility',
      'signal.riskNormal': 'Normal volatility',
      'signal.riskElevated': 'Elevated volatility',
      'signal.riskHigh': 'High volatility',
      'signal.nearHigh': 'Near the high',
      'signal.midRange': 'Mid range',
      'signal.nearLow': 'Near the low',
      'signal.volumeUp': 'Heavy volume',
      'signal.volumeDown': 'Light volume',
      'signal.volumeNormal': 'Average volume',
      'signal.seasonPositive': 'Seasonally positive',
      'signal.seasonNegative': 'Seasonally negative',
      'value.aboveMa50': 'Above MA50',
      'value.belowMa50': 'Below MA50',
      'punct.sep': '; ',
      'trend.f.above20': 'above its 20-day moving average',
      'trend.f.below20': 'below its 20-day moving average',
      'trend.f.above50': 'above its 50-day moving average',
      'trend.f.below50': 'below its 50-day moving average',
      'trend.f.above200': 'above its 200-day moving average',
      'trend.f.below200': 'below its 200-day moving average',
      'trend.f.golden': 'the 50-day average crossed above the 200-day (golden cross), a medium-term improvement',
      'trend.f.death': 'the 50-day average crossed below the 200-day (death cross), a medium-term deterioration',
      'trend.f.noCross': 'no fresh 50/200-day moving-average cross recently',
      'momentum.f.overbought': 'RSI is above 70: short-term overheating and pullback risk',
      'momentum.f.strong': 'RSI is in the strong zone, with buyers in control',
      'momentum.f.neutral': 'RSI is in its neutral band, with balanced forces',
      'momentum.f.weak': 'RSI is weak; short-term rebound energy is limited',
      'momentum.f.oversold': 'RSI is below 30: oversold conditions leave room for a technical rebound',
      'returns.f.positive': 'the past year is positive, so the uptrend still dominates',
      'returns.f.negative': 'the past year is negative, so the index is still repairing or correcting',
      'vol.f.low': 'volatility is low and sentiment is calm',
      'vol.f.normal': 'volatility is within its normal range',
      'vol.f.elevated': 'volatility is elevated; short-term drawdown risk is higher',
      'vol.f.high': 'volatility is high; mind position sizing and risk control',
      'vol.f.rising': '20-day volatility is above 60-day, so volatility is expanding',
      'vol.f.falling': '20-day volatility is below 60-day, so volatility is contracting',
      'dd.f.nearHigh': 'the index sits close to its all-time high: healthy, but avoid chasing',
      'dd.f.moderate': 'the drawdown is normal and has not broken the medium-term structure',
      'dd.f.deep': 'the drawdown is deep; watch whether it stabilises near key averages',
      'range.f.nearHigh': 'the index trades near the top of its 52-week range: clearly strong',
      'range.f.mid': 'the index sits in the middle of its 52-week range; direction is unresolved',
      'range.f.nearLow': 'the index trades near the bottom of its 52-week range: clearly weak',
      'volume.f.up': 'volume is above its 20-day average, so participation is rising',
      'volume.f.down': 'volume is below its 20-day average, so the market is waiting',
      'volume.f.normal': 'volume is close to its 20-day average',
      'season.f.positive': 'this calendar month has averaged gains historically (small sample, informational only)',
      'season.f.negative': 'this calendar month has averaged losses historically (small sample, informational only)',
      'macro.f.up': 'a stronger dollar usually pressures growth-stock valuations',
      'macro.f.down': 'a weaker dollar usually supports growth-stock valuations',
      'row.ma20': 'MA20',
      'row.ma50': 'MA50',
      'row.ma200': 'MA200',
      'row.maStructure': 'MA structure',
      'row.above': 'bullish stack',
      'row.below': 'bearish stack',
      'row.rsi14': 'RSI(14)',
      'row.ret1m': '1-month',
      'row.ret3m': '3-month',
      'row.ret6m': '6-month',
      'row.ytd': 'Year to date',
      'row.ret1y': '1-year',
      'row.ret3yAnn': '3-year (annualised)',
      'row.ret5yAnn': '5-year (annualised)',
      'row.vol20': '20-day annualised volatility',
      'row.vol60': '60-day annualised volatility',
      'row.ddFromAth': 'From all-time high',
      'row.ath': 'All-time closing high',
      'row.ddMaxAll': 'Max drawdown (history)',
      'row.ddMax1y': 'Max drawdown (1 year)',
      'row.high52': '52-week high',
      'row.low52': '52-week low',
      'row.pos52': 'Position in range',
      'row.volLast': 'Latest volume',
      'row.volAvg20': '20-day average volume',
      'row.volRatio': 'Volume vs 20-day average',
      'row.vol5v20': '5-day / 20-day average volume',
      'row.seasonMonth': 'Current month',
      'row.seasonAvg': 'Average historical month',
      'row.seasonWin': 'Win rate',
      'row.seasonYears': 'Sample years',
      'row.dxy': 'US Dollar Index',
      'row.dxyChange': 'Daily change',
      'footer.source': 'Source: Eastmoney (delayed quotes).',
      'footer.basis': 'Trend, momentum, volatility, drawdown and volume metrics are derived from daily closes.',
      'footer.disclaimer': 'For research reference only; not investment advice.',
      'footer.history': 'History starts',
      'value.none': '—',
    };

    const DICTS = { zh: ZH, en: EN };

    let localeApi = null;
    let translate = null;

    function t(key) {
      if (translate) {
        try {
          const value = translate(key);
          if (typeof value === 'string' && value) return value;
        } catch {
          /* fall through to the local dictionary */
        }
      }
      return EN[key] || key;
    }

    function useLocaleRevision() {
      const [, setRevision] = useState(0);
      useEffect(() => {
        if (!localeApi || typeof localeApi.subscribe !== 'function') return undefined;
        return localeApi.subscribe(() => setRevision((value) => (value + 1) % 1000000));
      }, []);
    }

    /* ---------------------------------------------------------------- */
    /* formatting helpers                                               */
    /* ---------------------------------------------------------------- */

    const priceFmt = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

    function fmtPrice(value) {
      return Number.isFinite(value) ? priceFmt.format(value) : t('value.none');
    }

    function fmtSignedPct(value, digits = 2) {
      if (!Number.isFinite(value)) return t('value.none');
      const sign = value > 0 ? '+' : '';
      return `${sign}${(value * 100).toFixed(digits)}%`;
    }

    function fmtPct(value, digits = 1) {
      return Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : t('value.none');
    }

    /** Format a value already expressed in percentage points (0.68 -> +0.68%). */
    function fmtPercentPoints(value, digits = 2) {
      if (!Number.isFinite(value)) return t('value.none');
      return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
    }

    function fmtMoney(value) {
      if (!Number.isFinite(value)) return t('value.none');
      const abs = Math.abs(value);
      if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
      if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
      if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
      if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
      return intFmt.format(value);
    }

    function pad2(value) {
      return String(value).padStart(2, '0');
    }

    function dateParts(ms) {
      const date = new Date(ms);
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
      };
    }

    function fmtDate(ms, withYear = true) {
      const p = dateParts(ms);
      return withYear ? `${p.year}-${pad2(p.month)}-${pad2(p.day)}` : `${pad2(p.month)}-${pad2(p.day)}`;
    }

    function fmtClock(ms) {
      try {
        return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '';
      }
    }

    function activeLocaleId() {
      try {
        const snapshot = localeApi && typeof localeApi.getLocale === 'function' ? localeApi.getLocale() : null;
        return (snapshot && snapshot.active) || 'en';
      } catch {
        return 'en';
      }
    }

    function fmtMonthName(month) {
      try {
        return new Intl.DateTimeFormat(activeLocaleId(), { month: 'long', timeZone: 'UTC' }).format(
          new Date(Date.UTC(2026, Math.max(0, month - 1), 1)),
        );
      } catch {
        return String(month);
      }
    }

    function ratioTo(current, base) {
      if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) return null;
      return current / base - 1;
    }

    function relativeBar(position) {
      if (!Number.isFinite(position)) return null;
      return Math.min(1, Math.max(0, position));
    }

    /** Cumulative change from the first point of the selected chart range to its last point. */
    function chartReturn(data) {
      const points = data && data.series && data.series.points;
      if (!Array.isArray(points) || points.length < 2) return null;
      const first = points[0] && points[0][1];
      const last = points[points.length - 1] && points[points.length - 1][1];
      return ratioTo(last, first);
    }

    function chartPositive(data) {
      const change = chartReturn(data);
      return change === null ? null : change >= 0;
    }

    /* ---------------------------------------------------------------- */
    /* signal derivation                                                */
    /* ---------------------------------------------------------------- */

    function trendPill(score) {
      if (score >= 3) return { tone: 'up', text: t('signal.strongUp') };
      if (score >= 1) return { tone: 'up', text: t('signal.up') };
      if (score <= -3) return { tone: 'down', text: t('signal.strongDown') };
      if (score <= -1) return { tone: 'down', text: t('signal.down') };
      return { tone: 'neutral', text: t('signal.neutral') };
    }

    function rsiPill(rsi) {
      if (!Number.isFinite(rsi)) return null;
      if (rsi >= 70) return { tone: 'warn', text: t('rsi.overbought') };
      if (rsi >= 55) return { tone: 'up', text: t('rsi.strong') };
      if (rsi >= 45) return { tone: 'neutral', text: t('rsi.neutral') };
      if (rsi >= 30) return { tone: 'down', text: t('rsi.weak') };
      return { tone: 'warn', text: t('rsi.oversold') };
    }

    function rsiNote(rsi) {
      if (!Number.isFinite(rsi)) return t('rsi.neutral');
      if (rsi >= 70) return t('momentum.f.overbought');
      if (rsi >= 55) return t('momentum.f.strong');
      if (rsi >= 45) return t('momentum.f.neutral');
      if (rsi >= 30) return t('momentum.f.weak');
      return t('momentum.f.oversold');
    }

    function riskPill(vol20) {
      if (!Number.isFinite(vol20)) return null;
      if (vol20 < 0.15) return { tone: 'up', text: t('signal.riskLow') };
      if (vol20 < 0.25) return { tone: 'neutral', text: t('signal.riskNormal') };
      if (vol20 < 0.35) return { tone: 'warn', text: t('signal.riskElevated') };
      return { tone: 'down', text: t('signal.riskHigh') };
    }

    function volNote(vol) {
      const parts = [];
      const v20 = vol && vol.d20;
      const v60 = vol && vol.d60;
      if (Number.isFinite(v20)) {
        if (v20 < 0.15) parts.push(t('vol.f.low'));
        else if (v20 < 0.25) parts.push(t('vol.f.normal'));
        else if (v20 < 0.35) parts.push(t('vol.f.elevated'));
        else parts.push(t('vol.f.high'));
      }
      if (Number.isFinite(v20) && Number.isFinite(v60)) {
        parts.push(v20 >= v60 ? t('vol.f.rising') : t('vol.f.falling'));
      }
      return parts.join(t('punct.sep'));
    }

    function drawdownNote(fromAth) {
      if (!Number.isFinite(fromAth)) return t('dd.f.moderate');
      if (fromAth > -0.05) return t('dd.f.nearHigh');
      if (fromAth > -0.15) return t('dd.f.moderate');
      return t('dd.f.deep');
    }

    function rangePill(position) {
      if (!Number.isFinite(position)) return null;
      if (position >= 0.8) return { tone: 'up', text: t('signal.nearHigh') };
      if (position <= 0.2) return { tone: 'down', text: t('signal.nearLow') };
      return { tone: 'neutral', text: t('signal.midRange') };
    }

    function rangeNote(position) {
      if (!Number.isFinite(position)) return t('range.f.mid');
      if (position >= 0.8) return t('range.f.nearHigh');
      if (position <= 0.2) return t('range.f.nearLow');
      return t('range.f.mid');
    }

    function volumePill(ratio) {
      if (!Number.isFinite(ratio)) return null;
      if (ratio >= 1.25) return { tone: 'warn', text: t('signal.volumeUp') };
      if (ratio <= 0.75) return { tone: 'down', text: t('signal.volumeDown') };
      return { tone: 'neutral', text: t('signal.volumeNormal') };
    }

    function volumeNote(ratio) {
      if (!Number.isFinite(ratio)) return t('volume.f.normal');
      if (ratio >= 1.25) return t('volume.f.up');
      if (ratio <= 0.75) return t('volume.f.down');
      return t('volume.f.normal');
    }

    function seasonPill(avg) {
      if (!Number.isFinite(avg)) return null;
      return avg >= 0
        ? { tone: 'up', text: t('signal.seasonPositive') }
        : { tone: 'down', text: t('signal.seasonNegative') };
    }

    function seasonNote(avg) {
      if (!Number.isFinite(avg)) return '';
      return avg >= 0 ? t('season.f.positive') : t('season.f.negative');
    }

    function toneForChange(value) {
      if (!Number.isFinite(value) || value === 0) return undefined;
      return value > 0 ? 'up' : 'down';
    }

    /* ---------------------------------------------------------------- */
    /* chart                                                            */
    /* ---------------------------------------------------------------- */

    function PriceChart({ series, range }) {
      const wrapRef = useRef(null);
      const [width, setWidth] = useState(760);
      const [hover, setHover] = useState(null);

      useEffect(() => {
        const node = wrapRef.current;
        if (!node || typeof ResizeObserver !== 'function') return undefined;
        const observer = new ResizeObserver((entries) => {
          const next = entries && entries[0] ? entries[0].contentRect.width : 0;
          if (next > 0) setWidth(Math.max(280, Math.floor(next)));
        });
        observer.observe(node);
        return () => observer.disconnect();
      }, []);

      const points = (series && Array.isArray(series.points) ? series.points : []).filter(
        (point) => Array.isArray(point) && Number.isFinite(point[1]),
      );
      const height = 320;
      const margin = { top: 14, right: 62, bottom: 28, left: 8 };
      const plotWidth = Math.max(40, width - margin.left - margin.right);
      const plotHeight = Math.max(40, height - margin.top - margin.bottom);

      const geometry = useMemo(() => {
        const n = points.length;
        if (n < 2) return null;
        const closes = points.map((point) => point[1]);
        const averages = points.map((point) => (Number.isFinite(point[2]) ? point[2] : null));
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < n; i += 1) {
          if (closes[i] < min) min = closes[i];
          if (closes[i] > max) max = closes[i];
          if (averages[i] !== null) {
            if (averages[i] < min) min = averages[i];
            if (averages[i] > max) max = averages[i];
          }
        }
        const padding = (max - min) * 0.08 || max * 0.02 || 1;
        const yMin = min - padding;
        const yMax = max + padding;
        const x = (index) => margin.left + (index / (n - 1)) * plotWidth;
        const y = (value) => margin.top + ((yMax - value) / (yMax - yMin || 1)) * plotHeight;

        const line = closes
          .map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)}`)
          .join(' ');
        const area = `${line} L${x(n - 1).toFixed(1)},${(margin.top + plotHeight).toFixed(1)} L${x(0).toFixed(1)},${(margin.top + plotHeight).toFixed(1)} Z`;

        let maPath = '';
        let drawing = false;
        for (let i = 0; i < n; i += 1) {
          if (averages[i] === null) {
            drawing = false;
            continue;
          }
          maPath += `${drawing ? 'L' : 'M'}${x(i).toFixed(1)},${y(averages[i]).toFixed(1)} `;
          drawing = true;
        }

        const yTicks = [];
        for (let i = 0; i <= 3; i += 1) {
          yTicks.push(yMax - ((yMax - yMin) * i) / 3);
        }
        const xTickIndexes = [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1];
        const longRange = range === 'max' || range === '5y' || range === '3y';
        const positive = closes[n - 1] >= closes[0];

        return {
          n,
          min,
          max,
          yMin,
          yMax,
          x,
          y,
          line,
          area,
          maPath,
          yTicks,
          xTickIndexes,
          longRange,
          positive,
          plotWidth,
          plotHeight,
        };
      }, [points, plotWidth, plotHeight, range]);

      const onMove = (event) => {
        if (!geometry) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const px = Math.min(Math.max(event.clientX - rect.left, margin.left), margin.left + plotWidth);
        const index = Math.round(((px - margin.left) / plotWidth) * (geometry.n - 1));
        setHover(Math.min(Math.max(index, 0), geometry.n - 1));
      };

      if (!geometry) {
        return h(
          'div',
          { className: 'ndx-chart' },
          h('div', { className: 'ndx-chart-empty' }, t('chart.empty')),
        );
      }

      const activeIndex = hover === null ? geometry.n - 1 : hover;
      const activePoint = points[activeIndex];
      const basePoint = points[0];
      // Change relative to the first trading day of the selected range, so the
      // tooltip answers "how much has it moved since this range began?" instead
      // of showing one day's move.
      const rangePct = basePoint ? ratioTo(activePoint[1], basePoint[1]) : null;
      const lineColor = geometry.positive
        ? 'var(--dsw-alias-state-success-primary)'
        : 'var(--dsw-alias-state-error-primary)';
      const tooltipX = Math.min(Math.max(geometry.x(activeIndex), 96), width - 96);

      return h(
        'div',
        {
          className: 'ndx-chart',
          ref: wrapRef,
          onMouseMove: onMove,
          onMouseLeave: () => setHover(null),
        },
        h(
          'svg',
          {
            className: 'ndx-chart-svg',
            width,
            height,
            viewBox: `0 0 ${width} ${height}`,
            role: 'img',
            'aria-label': `${t('page.title')} ${t('chart.legend.close')}`,
          },
          h(
            'defs',
            null,
            h(
              'linearGradient',
              { id: 'ndxAreaFill', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', style: { stopColor: lineColor, stopOpacity: 0.22 } }),
              h('stop', { offset: '100%', style: { stopColor: lineColor, stopOpacity: 0 } }),
            ),
          ),
          geometry.yTicks.map((value, index) =>
            h(
              'g',
              { key: `y-${index}` },
              h('line', {
                className: 'ndx-chart-grid',
                x1: margin.left,
                x2: margin.left + plotWidth,
                y1: geometry.y(value),
                y2: geometry.y(value),
              }),
              h(
                'text',
                {
                  className: 'ndx-chart-label',
                  x: margin.left + plotWidth + 8,
                  y: geometry.y(value) + 4,
                },
                fmtPrice(value).replace(/\.00$/, ''),
              ),
            ),
          ),
          geometry.xTickIndexes.map((index, tick) =>
            h(
              'text',
              {
                key: `x-${tick}`,
                className: 'ndx-chart-label',
                x: geometry.x(index),
                y: height - 8,
                textAnchor: index === 0 ? 'start' : index === geometry.n - 1 ? 'end' : 'middle',
              },
              fmtDate(points[index][0], geometry.longRange),
            ),
          ),
          h('path', { className: 'ndx-chart-area', d: geometry.area, fill: 'url(#ndxAreaFill)' }),
          h('path', { className: 'ndx-chart-ma', d: geometry.maPath.trim() }),
          h('path', { className: 'ndx-chart-line', d: geometry.line, style: { stroke: lineColor } }),
          hover !== null ? h('line', {
            className: 'ndx-chart-crosshair',
            x1: geometry.x(activeIndex),
            x2: geometry.x(activeIndex),
            y1: margin.top,
            y2: margin.top + plotHeight,
          }) : null,
          h('circle', {
            className: 'ndx-chart-dot',
            cx: geometry.x(activeIndex),
            cy: geometry.y(activePoint[1]),
            r: 4,
            style: { fill: lineColor },
          }),
        ),
        h(
          'div',
          { className: 'ndx-tooltip', style: { left: tooltipX } },
          h('div', { className: 'ndx-tooltip-date' }, fmtDate(activePoint[0])),
          h('div', { className: 'ndx-tooltip-price' }, fmtPrice(activePoint[1])),
          Number.isFinite(rangePct) && basePoint
            ? h(
                'div',
                { className: 'ndx-tooltip-change' },
                h('span', { className: 'ndx-tooltip-since' }, `${t('chart.sinceStart')} ${fmtDate(basePoint[0])}`),
                h(
                  'span',
                  { className: `ndx-tooltip-pct ndx-text-${toneForChange(rangePct) || 'neutral'}` },
                  fmtSignedPct(rangePct),
                ),
              )
            : null,
          Number.isFinite(activePoint[2])
            ? h('div', { className: 'ndx-tooltip-ma' }, `${t('chart.legend.ma')} ${fmtPrice(activePoint[2])}`)
            : null,
        ),
      );
    }

    /* ---------------------------------------------------------------- */
    /* insight cards                                                     */
    /* ---------------------------------------------------------------- */

    function InsightCard({ card }) {
      const children = [];
      children.push(
        h(
          'div',
          { className: 'ndx-card-head', key: 'head' },
          h('span', { className: 'ndx-card-title' }, card.title),
          card.pill
            ? h('span', { className: `ndx-pill ndx-pill--${card.pill.tone}` }, card.pill.text)
            : null,
        ),
      );
      if (card.value) {
        children.push(h('div', { className: 'ndx-card-value', key: 'value' }, card.value));
      }
      if (card.rows && card.rows.length) {
        children.push(
          h(
            'dl',
            { className: 'ndx-rows', key: 'rows' },
            card.rows.map((row, index) =>
              h(
                'div',
                { className: 'ndx-row', key: `${card.id}-${index}` },
                h('dt', null, row.label),
                h('dd', { className: row.tone ? `ndx-text-${row.tone}` : '' }, row.value),
              ),
            ),
          ),
        );
      }
      if (Number.isFinite(card.progress)) {
        children.push(
          h(
            'div',
            { className: 'ndx-bar', key: 'bar' },
            h('span', { className: 'ndx-bar-fill', style: { width: `${Math.round(card.progress * 100)}%` } }),
          ),
        );
      }
      if (card.note) {
        children.push(h('p', { className: 'ndx-note', key: 'note' }, card.note));
      }
      return h('section', { className: 'ndx-card' }, children);
    }

    function buildCards(data) {
      const m = data.metrics || {};
      const ma = m.ma || {};
      const returns = m.returns || {};
      const volatility = m.volatility || {};
      const drawdown = m.drawdown || {};
      const range52 = m.range52w || {};
      const volume = m.volume || {};
      const season = m.seasonality || {};
      const cards = [];

      const trendParts = [];
      if (ma.above20 === true) trendParts.push(t('trend.f.above20'));
      else if (ma.above20 === false) trendParts.push(t('trend.f.below20'));
      if (ma.above50 === true) trendParts.push(t('trend.f.above50'));
      else if (ma.above50 === false) trendParts.push(t('trend.f.below50'));
      if (ma.above200 === true) trendParts.push(t('trend.f.above200'));
      else if (ma.above200 === false) trendParts.push(t('trend.f.below200'));
      if (ma.cross === 'golden') trendParts.push(t('trend.f.golden'));
      else if (ma.cross === 'death') trendParts.push(t('trend.f.death'));
      else if (ma.cross) trendParts.push(t('trend.f.noCross'));
      const trendNote = trendParts.join(t('punct.sep'));

      cards.push({
        id: 'trend',
        title: t('insight.trend.title'),
        pill: trendPill(Number.isFinite(m.trendScore) ? m.trendScore : 0),
        value: ma.above50 ? t('value.aboveMa50') : t('value.belowMa50'),
        rows: [
          { label: t('row.ma20'), value: fmtPrice(ma.ma20), tone: ma.above20 ? 'up' : 'down' },
          { label: t('row.ma50'), value: fmtPrice(ma.ma50), tone: ma.above50 ? 'up' : 'down' },
          { label: t('row.ma200'), value: fmtPrice(ma.ma200), tone: ma.above200 ? 'up' : 'down' },
          {
            label: t('row.maStructure'),
            value: ma.ma50AboveMa200 ? t('row.above') : t('row.below'),
            tone: ma.ma50AboveMa200 ? 'up' : 'down',
          },
        ],
        note: trendNote,
      });

      cards.push({
        id: 'momentum',
        title: t('insight.momentum.title'),
        pill: rsiPill(m.rsi14),
        value: Number.isFinite(m.rsi14) ? `RSI ${m.rsi14.toFixed(1)}` : t('value.none'),
        rows: [
          { label: t('row.rsi14'), value: Number.isFinite(m.rsi14) ? m.rsi14.toFixed(1) : t('value.none') },
          { label: t('row.ret1m'), value: fmtSignedPct(returns.m1), tone: toneForChange(returns.m1) },
          { label: t('row.ret3m'), value: fmtSignedPct(returns.m3), tone: toneForChange(returns.m3) },
        ],
        note: rsiNote(m.rsi14),
      });

      cards.push({
        id: 'returns',
        title: t('insight.returns.title'),
        pill: Number.isFinite(returns.y1)
          ? returns.y1 >= 0
            ? { tone: 'up', text: t('signal.up') }
            : { tone: 'down', text: t('signal.down') }
          : null,
        value: fmtSignedPct(returns.y1),
        rows: [
          { label: t('row.ret1m'), value: fmtSignedPct(returns.m1), tone: toneForChange(returns.m1) },
          { label: t('row.ret3m'), value: fmtSignedPct(returns.m3), tone: toneForChange(returns.m3) },
          { label: t('row.ret6m'), value: fmtSignedPct(returns.m6), tone: toneForChange(returns.m6) },
          { label: t('row.ytd'), value: fmtSignedPct(returns.ytd), tone: toneForChange(returns.ytd) },
          { label: t('row.ret1y'), value: fmtSignedPct(returns.y1), tone: toneForChange(returns.y1) },
          { label: t('row.ret3yAnn'), value: fmtSignedPct(returns.y3), tone: toneForChange(returns.y3) },
          { label: t('row.ret5yAnn'), value: fmtSignedPct(returns.y5), tone: toneForChange(returns.y5) },
        ],
        note: (returns.y1 >= 0 ? t('returns.f.positive') : t('returns.f.negative')) || '',
      });

      cards.push({
        id: 'volatility',
        title: t('insight.volatility.title'),
        pill: riskPill(volatility.d20),
        value: fmtPct(volatility.d20),
        rows: [
          { label: t('row.vol20'), value: fmtPct(volatility.d20) },
          { label: t('row.vol60'), value: fmtPct(volatility.d60) },
        ],
        note: volNote(volatility),
      });

      cards.push({
        id: 'drawdown',
        title: t('insight.drawdown.title'),
        pill: null,
        value: fmtSignedPct(drawdown.fromAth),
        rows: [
          { label: t('row.ddFromAth'), value: fmtSignedPct(drawdown.fromAth) },
          { label: t('row.ath'), value: fmtPrice(drawdown.ath) },
          { label: t('row.ddMax1y'), value: fmtSignedPct(drawdown.max1y), tone: 'down' },
          { label: t('row.ddMaxAll'), value: fmtSignedPct(drawdown.maxAll), tone: 'down' },
        ],
        note: drawdownNote(drawdown.fromAth),
      });

      cards.push({
        id: 'range52',
        title: t('insight.range.title'),
        pill: rangePill(range52.position),
        value: Number.isFinite(range52.position) ? `${Math.round(range52.position * 100)}%` : t('value.none'),
        rows: [
          { label: t('row.high52'), value: fmtPrice(range52.high) },
          { label: t('row.low52'), value: fmtPrice(range52.low) },
          { label: t('row.pos52'), value: Number.isFinite(range52.position) ? `${Math.round(range52.position * 100)}%` : t('value.none') },
        ],
        progress: relativeBar(range52.position),
        note: rangeNote(range52.position),
      });

      cards.push({
        id: 'volume',
        title: t('insight.volume.title'),
        pill: volumePill(volume.ratio20),
        value: Number.isFinite(volume.ratio20) ? `${volume.ratio20.toFixed(2)}×` : t('value.none'),
        rows: [
          { label: t('row.volLast'), value: fmtMoney(volume.last) },
          { label: t('row.volAvg20'), value: fmtMoney(volume.avg20) },
          { label: t('row.volRatio'), value: Number.isFinite(volume.ratio20) ? `${volume.ratio20.toFixed(2)}×` : t('value.none') },
          { label: t('row.vol5v20'), value: Number.isFinite(volume.trend5v20) ? `${volume.trend5v20.toFixed(2)}×` : t('value.none') },
        ],
        note: volumeNote(volume.ratio20),
      });

      if (season && Number.isFinite(season.avg)) {
        cards.push({
          id: 'seasonality',
          title: t('insight.seasonality.title'),
          pill: seasonPill(season.avg),
          value: fmtSignedPct(season.avg),
          rows: [
            { label: t('row.seasonMonth'), value: fmtMonthName(season.month) },
            { label: t('row.seasonAvg'), value: fmtSignedPct(season.avg), tone: toneForChange(season.avg) },
            { label: t('row.seasonWin'), value: fmtPct(season.winRate, 0) },
            { label: t('row.seasonYears'), value: String(season.years) },
          ],
          note: seasonNote(season.avg),
        });
      }

      const macro = data.macro;
      if (macro && Number.isFinite(macro.value)) {
        cards.push({
          id: 'macro',
          title: t('insight.macro.title'),
          pill: null,
          value: fmtPrice(macro.value),
          rows: [
            { label: t('row.dxy'), value: fmtPrice(macro.value) },
            {
              label: t('row.dxyChange'),
              value: fmtPercentPoints(macro.changePct),
              tone: toneForChange(macro.changePct),
            },
          ],
          note: Number.isFinite(macro.changePct) && macro.changePct >= 0 ? t('macro.f.up') : t('macro.f.down'),
        });
      }

      return cards;
    }

    function summaryLines(data) {
      const m = data.metrics || {};
      const ma = m.ma || {};
      const drawdown = m.drawdown || {};
      const lines = [];

      const trendParts = [];
      if (ma.above20 === true) trendParts.push(t('trend.f.above20'));
      else if (ma.above20 === false) trendParts.push(t('trend.f.below20'));
      if (ma.above50 === true) trendParts.push(t('trend.f.above50'));
      else if (ma.above50 === false) trendParts.push(t('trend.f.below50'));
      if (ma.above200 === true) trendParts.push(t('trend.f.above200'));
      else if (ma.above200 === false) trendParts.push(t('trend.f.below200'));
      lines.push([t('insight.trend.title'), trendParts.join(t('punct.sep'))]);

      lines.push([t('insight.momentum.title'), rsiNote(m.rsi14)]);
      lines.push([t('insight.volatility.title'), volNote(m.volatility || {})]);
      lines.push([t('insight.drawdown.title'), drawdownNote(drawdown.fromAth)]);
      return lines;
    }

    function SummaryCard({ data }) {
      const drawdown = (data.metrics && data.metrics.drawdown) || {};
      const lines = summaryLines(data);
      const price = data.quote && data.quote.price;
      const summaryIntro = [
        Number.isFinite(price) ? `${t('page.title')} ${fmtPrice(price)}` : t('page.title'),
        Number.isFinite(drawdown.fromAth) ? fmtSignedPct(drawdown.fromAth) : '',
      ]
        .filter(Boolean)
        .join(' · ');
      return h(
        'section',
        { className: 'ndx-summary' },
        h('div', { className: 'ndx-summary-head' }, h('h2', { className: 'ndx-summary-title' }, t('summary.title'))),
        h('p', { className: 'ndx-summary-intro' }, summaryIntro),
        h(
          'ul',
          { className: 'ndx-summary-list' },
          lines.map((line, index) =>
            h(
              'li',
              { key: index },
              h('span', { className: 'ndx-summary-label' }, line[0]),
              h('span', null, line[1]),
            ),
          ),
        ),
      );
    }

    /* ---------------------------------------------------------------- */
    /* page                                                              */
    /* ---------------------------------------------------------------- */

    const MARKET_STATUS_KEY = {
      open: 'status.open',
      pre: 'status.pre',
      post: 'status.post',
      closed: 'status.closed',
    };

    function Stat({ label, value, tone }) {
      return h(
        'div',
        { className: 'ndx-stat' },
        h('span', { className: 'ndx-stat-label' }, label),
        h('span', { className: `ndx-stat-value${tone ? ` ndx-text-${tone}` : ''}` }, value),
      );
    }

    function MainPanel() {
      useLocaleRevision();
      const [range, setRange] = useState('1y');
      const [snapshot, setSnapshot] = useState(null);
      const [status, setStatus] = useState('loading');
      const [error, setError] = useState(null);
      const [tick, setTick] = useState(0);
      const [auto, setAuto] = useState(() => {
        try {
          return window.localStorage.getItem(STORAGE_KEY) !== '0';
        } catch {
          return true;
        }
      });
      const refreshSeconds = useRef(60);

      useEffect(() => {
        try {
          window.localStorage.setItem(STORAGE_KEY, auto ? '1' : '0');
        } catch {
          /* storage unavailable */
        }
      }, [auto]);

      useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        setStatus((current) => (current === 'ready' ? 'refreshing' : 'loading'));
        const load = async () => {
          try {
            const url = new URL('dsh-nasdaq100/data', document.baseURI);
            url.searchParams.set('range', range);
            const response = await fetch(url.toString(), {
              signal: controller.signal,
              headers: { accept: 'application/json' },
            });
            const body = await response.json().catch(() => null);
            if (!response.ok || !body || body.ok !== true) {
              throw new Error((body && body.error && body.error.message) || `HTTP ${response.status}`);
            }
            if (cancelled) return;
            if (body.meta && Number.isFinite(body.meta.refreshSeconds)) {
              refreshSeconds.current = body.meta.refreshSeconds;
            }
            setSnapshot(body);
            setStatus('ready');
            setError(null);
          } catch (caught) {
            if (cancelled || (caught && caught.name === 'AbortError')) return;
            setStatus('error');
            setError(caught instanceof Error ? caught.message : String(caught));
          }
        };
        load();
        return () => {
          cancelled = true;
          controller.abort();
        };
      }, [range, tick]);

      useEffect(() => {
        if (!auto) return undefined;
        const timer = window.setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          setTick((value) => value + 1);
        }, Math.max(20, refreshSeconds.current) * 1000);
        return () => window.clearInterval(timer);
      }, [auto]);

      const quote = snapshot ? snapshot.quote || {} : {};
      const changeFraction =
        Number.isFinite(quote.change) && Number.isFinite(quote.prevClose) && quote.prevClose !== 0
          ? quote.change / quote.prevClose
          : Number.isFinite(quote.changePct)
            ? quote.changePct / 100
            : null;
      const changeTone = toneForChange(changeFraction);
      const cards = snapshot ? buildCards(snapshot) : [];
      const rangeReturn = chartReturn(snapshot);

      const header = snapshot
        ? h(
            'header',
            { className: 'ndx-head' },
            h(
              'div',
              { className: 'ndx-title-row' },
              h(
                'div',
                null,
                h('h1', { className: 'ndx-title' }, t('page.title')),
                h('p', { className: 'ndx-sub' }, t('page.subtitle')),
              ),
              h(
                'div',
                { className: 'ndx-head-actions' },
                h(
                  'span',
                  { className: 'ndx-pill ndx-pill--neutral' },
                  h('span', { className: 'ndx-dot' }),
                  t(MARKET_STATUS_KEY[snapshot.marketStatus] || 'status.closed'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: `ndx-btn${auto ? ' is-active' : ''}`,
                    'aria-pressed': auto,
                    onClick: () => setAuto((value) => !value),
                  },
                  auto ? t('actions.autoOn') : t('actions.autoOff'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ndx-btn',
                    onClick: () => setTick((value) => value + 1),
                    disabled: status === 'refreshing',
                  },
                  status === 'refreshing' ? t('refreshing') : t('actions.refresh'),
                ),
              ),
            ),
            h(
              'div',
              { className: 'ndx-price-row' },
              h('span', { className: 'ndx-price' }, fmtPrice(quote.price)),
              h(
                'span',
                { className: `ndx-change ndx-text-${changeTone || 'neutral'}` },
                `${Number.isFinite(quote.change) ? (quote.change > 0 ? '+' : '') + fmtPrice(quote.change) : t('value.none')}  ${fmtSignedPct(changeFraction)}`,
              ),
              h(
                'span',
                { className: 'ndx-asof' },
                `${t('updated.asof')} ${snapshot.asOf || t('value.none')}`,
                snapshot.fetchedAt ? ` · ${t('updated.local')} ${fmtClock(snapshot.fetchedAt)}` : '',
              ),
            ),
            h(
              'div',
              { className: 'ndx-stats' },
              h(Stat, { label: t('quote.open'), value: fmtPrice(quote.open) }),
              h(Stat, { label: t('quote.high'), value: fmtPrice(quote.high) }),
              h(Stat, { label: t('quote.low'), value: fmtPrice(quote.low) }),
              h(Stat, { label: t('quote.prevClose'), value: fmtPrice(quote.prevClose) }),
              h(Stat, { label: t('quote.volume'), value: fmtMoney(quote.volume) }),
              h(Stat, {
                label: t('quote.week52'),
                value:
                  snapshot.metrics && snapshot.metrics.range52w
                    ? `${fmtPrice(snapshot.metrics.range52w.low)} – ${fmtPrice(snapshot.metrics.range52w.high)}`
                    : t('value.none'),
              }),
            ),
          )
        : null;

      const body = !snapshot
        ? status === 'error'
          ? h(
              'div',
              { className: 'ndx-center' },
              h('div', { className: 'ndx-error-title' }, t('error.title')),
              h('p', { className: 'ndx-error-message' }, error || ''),
              h('p', { className: 'ndx-error-hint' }, t('error.hint')),
              h(
                'button',
                { type: 'button', className: 'ndx-btn', onClick: () => setTick((value) => value + 1) },
                t('error.retry'),
              ),
            )
          : h(
              'div',
              { className: 'ndx-center' },
              h('div', { className: 'ndx-spinner' }),
              h('p', { className: 'ndx-error-hint' }, t('loading')),
            )
        : h(
            'div',
            null,
            h(
              'div',
              { className: 'ndx-toolbar' },
              h(
                'div',
                { className: 'ndx-tabs', role: 'tablist' },
                RANGES.map((item) =>
                  h(
                    'button',
                    {
                      key: item,
                      type: 'button',
                      role: 'tab',
                      'aria-selected': item === range,
                      className: `ndx-tab${item === range ? ' is-active' : ''}`,
                      onClick: () => setRange(item),
                    },
                    t(`range.${item}`),
                  ),
                ),
              ),
              status === 'refreshing'
                ? h('span', { className: 'ndx-refreshing' }, t('refreshing'))
                : status === 'error'
                  ? h('span', { className: 'ndx-refreshing ndx-text-warn' }, t('refreshing.failed'))
                  : null,
            ),
            h(
              'section',
              { className: 'ndx-chart-card' },
              h(
                'div',
                { className: 'ndx-chart-head' },
                h(
                  'span',
                  { className: 'ndx-legend' },
                  h('span', {
                    className: 'ndx-legend-dot',
                    style: {
                      background:
                        chartPositive(snapshot) === false
                          ? 'var(--dsw-alias-state-error-primary)'
                          : 'var(--dsw-alias-state-success-primary)',
                    },
                  }),
                  t('chart.legend.close'),
                  h('span', { className: 'ndx-legend-line' }),
                  t('chart.legend.ma'),
                ),
                h(
                  'div',
                  { className: 'ndx-chart-meta' },
                  h('span', { className: 'ndx-chart-range' }, `${snapshot.series ? snapshot.series.startDate : ''} → ${snapshot.series ? snapshot.series.endDate : ''}`),
                  Number.isFinite(rangeReturn)
                    ? h(
                        'span',
                        { className: `ndx-chart-return ndx-text-${toneForChange(rangeReturn) || 'neutral'}` },
                        `${t('chart.rangeReturn')} ${fmtSignedPct(rangeReturn)}`,
                      )
                    : null,
                ),
              ),
              h(PriceChart, { series: snapshot.series, range }),
            ),
            h(SummaryCard, { data: snapshot }),
            h(
              'div',
              { className: 'ndx-grid' },
              cards.map((card) => h(InsightCard, { key: card.id, card })),
            ),
            h(
              'p',
              { className: 'ndx-footer' },
              `${t('footer.source')} ${t('footer.basis')} ${t('footer.disclaimer')}`,
              snapshot.meta && snapshot.meta.firstDate
                ? ` ${t('footer.history')} ${snapshot.meta.firstDate}。`
                : '',
            ),
          );

      return h(
        'div',
        { className: 'ndx-page' },
        h('style', null, CSS),
        h('div', { className: 'ndx-inner' }, header, body),
      );
    }

    function PanelIcon(props) {
      const size = props && Number.isFinite(props.size) ? props.size : 18;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
          focusable: false,
          style: { display: 'block' },
        },
        h('path', {
          d: 'M3 17.5 L8.2 11.2 L12.3 14.4 L17 6.8 L21 10.2',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M3 21 H21',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          opacity: 0.45,
        }),
      );
    }

    /* ---------------------------------------------------------------- */
    /* styles                                                           */
    /* ---------------------------------------------------------------- */

    const CSS = `
.ndx-page{height:100%;overflow-y:auto;overflow-x:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);-webkit-font-smoothing:antialiased}
.ndx-inner{max-width:1180px;margin:0 auto;padding-top:calc(var(--dsh-frame-top-clearance,0px) + 20px);padding-right:24px;padding-bottom:40px;padding-left:calc(24px + var(--dsh-frame-leading-clearance,0px))}
.ndx-head{display:flex;flex-direction:column;gap:14px;margin-bottom:20px}
.ndx-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.ndx-title{font-size:22px;line-height:1.25;font-weight:600;margin:0;letter-spacing:-0.01em}
.ndx-sub{margin:6px 0 0;font-size:13px;color:var(--dsw-alias-label-secondary)}
.ndx-head-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ndx-price-row{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.ndx-price{font-size:40px;line-height:1.05;font-weight:650;letter-spacing:-0.02em;font-variant-numeric:tabular-nums}
.ndx-change{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
.ndx-asof{font-size:12px;color:var(--dsw-alias-label-secondary)}
.ndx-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(126px,1fr));gap:10px}
.ndx-stat{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.ndx-stat-label{font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.ndx-stat-value{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.ndx-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.ndx-tabs{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.ndx-tab{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);height:28px;padding:0 11px;border-radius:7px;font-size:12.5px;font-weight:500;cursor:pointer;transition:background .12s ease,color .12s ease}
.ndx-tab:hover{color:var(--dsw-alias-label-primary)}
.ndx-tab.is-active{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1)}
.ndx-refreshing{font-size:12px;color:var(--dsw-alias-label-secondary)}
.ndx-btn{appearance:none;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12.5px;font-weight:500;cursor:pointer;transition:border-color .12s ease,color .12s ease}
.ndx-btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l2)}
.ndx-btn:disabled{cursor:default;color:var(--dsw-alias-label-secondary)}
.ndx-btn.is-active{color:var(--dsw-alias-brand-primary)}
.ndx-pill{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);font-size:11.5px;font-weight:500;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.ndx-pill--up{color:var(--dsw-alias-state-success-primary)}
.ndx-pill--down{color:var(--dsw-alias-state-error-primary)}
.ndx-pill--warn{color:var(--dsw-alias-state-warn-primary)}
.ndx-dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.ndx-chart-card{padding:14px 16px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);margin-bottom:16px}
.ndx-chart-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px}
.ndx-legend{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.ndx-legend-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-success-primary)}
.ndx-legend-line{display:inline-block;width:14px;height:0;margin-left:10px;border-top:1.6px dashed var(--dsw-alias-label-secondary);opacity:.8}
.ndx-chart-range{font-size:11.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.ndx-chart-meta{display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap}
.ndx-chart-return{font-size:11.5px;font-weight:600;font-variant-numeric:tabular-nums}
.ndx-chart{position:relative;width:100%;min-height:220px}
.ndx-chart-svg{display:block;overflow:visible}
.ndx-chart-grid{stroke:var(--dsw-alias-border-l1);stroke-width:1}
.ndx-chart-label{fill:var(--dsw-alias-label-secondary);font-size:10.5px;font-variant-numeric:tabular-nums}
.ndx-chart-line{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ndx-chart-ma{fill:none;stroke:var(--dsw-alias-label-secondary);stroke-width:1.4;stroke-dasharray:4 4;opacity:.75}
.ndx-chart-area{opacity:1}
.ndx-chart-crosshair{stroke:var(--dsw-alias-border-l2);stroke-width:1;stroke-dasharray:3 3}
.ndx-chart-dot{stroke:var(--dsw-alias-bg-layer-1);stroke-width:2}
.ndx-chart-empty{display:flex;align-items:center;justify-content:center;height:280px;font-size:13px;color:var(--dsw-alias-label-secondary)}
.ndx-tooltip{position:absolute;top:4px;transform:translateX(-50%);min-width:104px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-overlay);box-shadow:0 6px 20px rgba(0,0,0,.12);pointer-events:none;font-size:11.5px;line-height:1.5;font-variant-numeric:tabular-nums;white-space:nowrap;z-index:2}
.ndx-tooltip-date{color:var(--dsw-alias-label-secondary)}
.ndx-tooltip-price{font-size:13.5px;font-weight:600}
.ndx-tooltip-ma{color:var(--dsw-alias-label-secondary)}
.ndx-tooltip-change{display:flex;align-items:baseline;gap:6px}
.ndx-tooltip-since{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.ndx-tooltip-pct{font-weight:600}
.ndx-summary{padding:16px 18px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);margin-bottom:16px}
.ndx-summary-title{margin:0;font-size:14px;font-weight:600}
.ndx-summary-intro{margin:8px 0 0;font-size:12.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.ndx-summary-list{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:7px}
.ndx-summary-list li{display:flex;gap:10px;font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.ndx-summary-label{flex:0 0 auto;min-width:56px;font-weight:600;color:var(--dsw-alias-label-primary)}
.ndx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(272px,1fr));gap:12px}
.ndx-card{display:flex;flex-direction:column;padding:14px 16px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.ndx-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.ndx-card-title{font-size:13px;font-weight:600}
.ndx-card-value{font-size:20px;font-weight:600;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;margin-bottom:8px}
.ndx-rows{margin:0;display:flex;flex-direction:column;gap:5px}
.ndx-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:12px}
.ndx-row dt{color:var(--dsw-alias-label-secondary);margin:0}
.ndx-row dd{margin:0;font-weight:500;font-variant-numeric:tabular-nums;text-align:right}
.ndx-note{margin:10px 0 0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.ndx-bar{position:relative;height:6px;margin-top:12px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.ndx-bar-fill{position:absolute;top:0;bottom:0;left:0;border-radius:3px;background:var(--dsw-alias-brand-primary)}
.ndx-text-up{color:var(--dsw-alias-state-success-primary)}
.ndx-text-down{color:var(--dsw-alias-state-error-primary)}
.ndx-text-warn{color:var(--dsw-alias-state-warn-primary)}
.ndx-text-neutral{color:var(--dsw-alias-label-secondary)}
.ndx-center{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:320px;text-align:center}
.ndx-spinner{width:26px;height:26px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);animation:ndxSpin .8s linear infinite}
.ndx-error-title{font-size:15px;font-weight:600}
.ndx-error-message{max-width:720px;margin:0;font-size:12.5px;color:var(--dsw-alias-state-error-primary);word-break:break-word}
.ndx-error-hint{max-width:720px;margin:0;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6}
.ndx-footer{margin:20px 0 0;font-size:11px;line-height:1.7;color:var(--dsw-alias-label-secondary)}
@keyframes ndxSpin{to{transform:rotate(360deg)}}
@media (max-width:720px){
  .ndx-inner{padding-right:16px;padding-left:calc(16px + var(--dsh-frame-leading-clearance,0px))}
  .ndx-price{font-size:32px}
  .ndx-title{font-size:19px}
}
@media (prefers-reduced-motion:reduce){
  .ndx-spinner{animation:none}
  .ndx-tab,.ndx-btn{transition:none}
}
`;

    /* ---------------------------------------------------------------- */
    /* plugin body                                                      */
    /* ---------------------------------------------------------------- */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        try {
          localeApi = ctx.locale || null;
        } catch {
          localeApi = null;
        }
        if (localeApi && typeof localeApi.register === 'function') {
          ctx.effect(
            () => localeApi.register(NS, 'zh', ZH),
            'nasdaq100: zh dictionary',
          );
          ctx.effect(
            () => localeApi.register(NS, 'en', EN),
            'nasdaq100: en dictionary',
          );
          translate = localeApi.bind(NS);
        }

        const label = () => t('panel.title');

        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: 'nasdaq100' }, MainPanel),
        );
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: 'nasdaq100', order: 15, label },
            PanelIcon,
          ),
        );
      },
    };
  },
});
