/**
 * Collects extended statistics from candlestick data without returning raw arrays
 * Includes EMA20, EMA50, EMA100 (null if insufficient data)
 * @param {Array<{open:number, high:number, low:number, close:number, volume:number}>} candles
 * @param {number} riskFreeRate - optional annualized risk-free rate for Sharpe
 * @returns {Object} statistics
 */
function collectStatistics(candles, riskFreeRate = 0) {
    if (!candles || candles.length === 0) return {};

    const stats = {
        count: candles.length,

        averageClose: 0,
        minClose: Infinity,
        maxClose: -Infinity,
        averageVolume: 0,
        minVolume: Infinity,
        maxVolume: -Infinity,

        totalUpMoves: 0,
        totalDownMoves: 0,
        bodySizeStats: { avg: 0, min: Infinity, max: -Infinity },
        wicksStats: { upperAvg: 0, lowerAvg: 0, upperMax: -Infinity, lowerMax: -Infinity },

        averageReturn: 0,
        volatility: 0,
        sharpe: 0,
        cumulativeReturn: 0,
        maxDrawdown: 0,

        avgRange: 0,
        maxRange: 0,
        minRange: Infinity,

        dojiCount: 0,
        hammerCount: 0,
        invertedHammerCount: 0,
        engulfingBullish: 0,
        engulfingBearish: 0,

        ema20: null,
        ema50: null,
        ema100: null,
    };

    let prevClose = null;
    let totalBody = 0;
    let totalUpperWick = 0;
    let totalLowerWick = 0;
    let cumulativeReturn = 1;
    let peakClose = -Infinity;
    let maxDrawdown = 0;
    const returnsArray = [];

    // EMA helpers
    const emaPeriods = { 20: null, 50: null, 100: null };
    const emaMultipliers = {
        20: 2 / (20 + 1),
        50: 2 / (50 + 1),
        100: 2 / (100 + 1)
    };
    const emaSums = { 20: 0, 50: 0, 100: 0 };

    for (let i = 0; i < candles.length; i++) {
        const c = candles[i];

        // basic stats
        stats.averageClose += c.close;
        stats.minClose = Math.min(stats.minClose, c.close);
        stats.maxClose = Math.max(stats.maxClose, c.close);
        stats.averageVolume += c.volume;
        stats.minVolume = Math.min(stats.minVolume, c.volume);
        stats.maxVolume = Math.max(stats.maxVolume, c.volume);

        // up/down moves
        if (c.close > c.open) stats.totalUpMoves++;
        if (c.close < c.open) stats.totalDownMoves++;

        const bodySize = Math.abs(c.close - c.open);
        totalBody += bodySize;
        stats.bodySizeStats.min = Math.min(stats.bodySizeStats.min, bodySize);
        stats.bodySizeStats.max = Math.max(stats.bodySizeStats.max, bodySize);

        const upperWick = c.high - Math.max(c.open, c.close);
        const lowerWick = Math.min(c.open, c.close) - c.low;
        totalUpperWick += upperWick;
        totalLowerWick += lowerWick;
        stats.wicksStats.upperMax = Math.max(stats.wicksStats.upperMax, upperWick);
        stats.wicksStats.lowerMax = Math.max(stats.wicksStats.lowerMax, lowerWick);

        const range = c.high - c.low;
        stats.avgRange += range;
        stats.maxRange = Math.max(stats.maxRange, range);
        stats.minRange = Math.min(stats.minRange, range);

        // returns
        if (prevClose !== null) {
            const ret = (c.close - prevClose) / prevClose;
            returnsArray.push(ret);
            cumulativeReturn *= (1 + ret);

            // max drawdown
            peakClose = Math.max(peakClose, c.close);
            const drawdown = (c.close - peakClose) / peakClose;
            maxDrawdown = Math.min(maxDrawdown, drawdown);
        }

        // candle patterns
        if (bodySize < range * 0.1) stats.dojiCount++;
        if (bodySize < range * 0.3 && c.close > c.open && lowerWick > bodySize * 2) stats.hammerCount++;
        if (bodySize < range * 0.3 && c.close < c.open && upperWick > bodySize * 2) stats.invertedHammerCount++;

        // engulfing patterns
        if (i > 0) {
            const prev = candles[i - 1];
            if (prev.close < prev.open && c.close > c.open && c.close > prev.open && c.open < prev.close) stats.engulfingBullish++;
            if (prev.close > prev.open && c.close < c.open && c.open > prev.close && c.close < prev.open) stats.engulfingBearish++;
        }

        prevClose = c.close;

        // EMA calculations
        for (const period of [20, 50, 100]) {
            if (i < period) {
                emaSums[period] += c.close;
                if (i === period - 1) {
                    emaPeriods[period] = emaSums[period] / period; // simple SMA start
                }
            } else {
                emaPeriods[period] = (c.close - emaPeriods[period]) * emaMultipliers[period] + emaPeriods[period];
            }
        }
    }

    // averages
    stats.averageClose /= stats.count;
    stats.averageVolume /= stats.count;
    stats.bodySizeStats.avg = totalBody / stats.count;
    stats.wicksStats.upperAvg = totalUpperWick / stats.count;
    stats.wicksStats.lowerAvg = totalLowerWick / stats.count;
    stats.avgRange /= stats.count;

    // returns stats
    const meanReturn = returnsArray.reduce((a, b) => a + b, 0) / returnsArray.length || 0;
    stats.averageReturn = meanReturn;

    const variance = returnsArray.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returnsArray.length || 0;
    stats.volatility = Math.sqrt(variance);

    stats.cumulativeReturn = cumulativeReturn - 1;
    stats.maxDrawdown = Math.abs(maxDrawdown);
    stats.sharpe = stats.volatility > 0 ? (meanReturn - riskFreeRate) / stats.volatility : 0;

    // EMA final values
    stats.ema20 = candles.length >= 20 ? emaPeriods[20] : null;
    stats.ema50 = candles.length >= 50 ? emaPeriods[50] : null;
    stats.ema100 = candles.length >= 100 ? emaPeriods[100] : null;

    // remove OHCLVR
    return {
        ...stats,
        open: undefined,
        high: undefined,
        low: undefined,
        close: undefined,
        volume: undefined,
        returns: undefined,
    };
}

export default collectStatistics;
