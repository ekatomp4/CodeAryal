/**
 * Statistics module — computes common financial indicators from an array of price data.
 * @param {Array<Object>} data - Array of objects like { open, high, low, close, volume }.
 * @returns {Object} Object containing all calculated statistics and helper methods.
 */
function Statistics(data = []) {
    const ticks = data.length;
    if (ticks === 0) return {};

    // helper: mean
    const mean = data.reduce((a, b) => a + b.close, 0) / ticks;

    // helper: standard deviation
    const stdDev = Math.sqrt(
        data.reduce((acc, d) => acc + Math.pow(d.close - mean, 2), 0) / ticks
    );

    // helper: volatility (based on returns)
    const returns = [];
    for (let i = 1; i < ticks; i++) {
        returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
    const volMean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(
        returns.reduce((a, b) => a + Math.pow(b - volMean, 2), 0) / returns.length
    );

    // helper: RSI
    const periodRSI = 14;
    let gains = 0, losses = 0;
    for (let i = 1; i <= periodRSI && i < ticks; i++) {
        const diff = data[i].close - data[i - 1].close;
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / periodRSI;
    const avgLoss = losses / periodRSI;
    const rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
    const RSI = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

    // helper: MACD
    const EMA = (period) => {
        const k = 2 / (period + 1);
        const arr = [];
        let prev = data[0].close;
        for (let i = 0; i < ticks; i++) {
            const val = data[i].close * k + prev * (1 - k);
            arr.push(val);
            prev = val;
        }
        return arr;
    };
    const shortEMA = EMA(12);
    const longEMA = EMA(26);
    const macdLine = shortEMA.map((v, i) => v - longEMA[i]);
    const signalLine = (() => {
        const k = 2 / (9 + 1);
        const res = [];
        let prev = macdLine[0];
        for (let i = 0; i < macdLine.length; i++) {
            const val = macdLine[i] * k + prev * (1 - k);
            res.push(val);
            prev = val;
        }
        return res;
    })();
    const histogram = macdLine.map((v, i) => v - signalLine[i]);

    // placeholder fundamentals
    const fundamentals = {
        ROE: 0,
        Spread: 0,
        PE: 0,
        PB: 0,
        PEG: 0,
        EPS: 0,
        Beta: 0,
        Alpha: 0,
        Correlation: 0
    };

    // object of all computed statistics
    const results = {
        mean,
        stdDev,
        volatility,
        RSI,
        MACD: {
            macdLine,
            signalLine,
            histogram
        },
        ...fundamentals,
        meta: {
            count: ticks,
            lastClose: data[ticks - 1].close,
            lastVolume: data[ticks - 1].volume
        },

        getFundamentals: function() {
            const { earnings, bookValue, equity, revenue, sharesOutstanding, netIncome, close } = data[data.length - 1];
            return {
                pe: close / (earnings / sharesOutstanding),
                pb: close / (bookValue / sharesOutstanding),
                peg: (close / (earnings / sharesOutstanding)) / ((earnings / sharesOutstanding) / previousEPS),
                roe: netIncome / equity,
                eps: earnings / sharesOutstanding,
            };
        }
    };

    /**
     * Recalculate all statistics using updated data.
     * @param {Array<Object>} newData - Updated dataset.
     * @returns {Object} Updated statistics.
     */
    results.recalculate = function(newData = data) {
        return Statistics(newData);
    };

    return results;
}

export default Statistics;
