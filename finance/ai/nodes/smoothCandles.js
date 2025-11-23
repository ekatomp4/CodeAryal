import smoothSeries from "./smoothSeries.js";

function smoothCandles(candles, smoothPercent = 0.6) {
    if (!candles || candles.length === 0) return candles;

    // Extract whole-series arrays
    const opens  = candles.map(c => c.open);
    const highs  = candles.map(c => c.high);
    const lows   = candles.map(c => c.low);
    const closes = candles.map(c => c.close);

    // Smooth entire series
    const sOpens  = smoothSeries(opens, smoothPercent);
    const sHighs  = smoothSeries(highs, smoothPercent);
    const sLows   = smoothSeries(lows, smoothPercent);
    const sCloses = smoothSeries(closes, smoothPercent);

    // Rebuild candles with smoothed values
    const output = [];
    for (let i = 0; i < candles.length; i++) {
        output.push({
            ...candles[i],
            open:  sOpens[i],
            high:  sHighs[i],
            low:   sLows[i],
            close: sCloses[i]
        });
    }

    return output;
}

export default smoothCandles;
