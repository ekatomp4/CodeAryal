import TRAINING_PARAMS from "./TRAINING_PARAMS.js";

function appendExtraData(dataset) {
    const period = 14; // RSI period
    let gains = [];
    let losses = [];

    // calculate returnPct and populate gains/losses
    for (let i = 1; i < dataset.length; i++) {
        const prevClose = dataset[i - 1].close;
        const currClose = dataset[i].close;
        const change = currClose - prevClose;

        dataset[i].returnPct = (change / prevClose) * 100;

        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
    }

    if (dataset.length > 0) {
        dataset[0].returnPct = 0;
    }

    // calculate RSI
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < dataset.length; i++) {
        if (i < period) {
            avgGain += gains[i] || 0;
            avgLoss += losses[i] || 0;
            if (i === period - 1) {
                avgGain /= period;
                avgLoss /= period;
                const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                dataset[i].rsi = 100 - 100 / (1 + rs);
            } else {
                dataset[i].rsi = 50; // placeholder until we have enough data
            }
        } else {
            const gain = gains[i] || 0;
            const loss = losses[i] || 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            dataset[i].rsi = 100 - 100 / (1 + rs);
        }
    }

    // calculate movement -1 -> 1
    for (let i = 0; i < dataset.length; i++) {
        const change = (dataset[i].close - dataset[i - 1]?.close ?? 0) || 0;
        dataset[i].movement = change > 0 ? 1 : change < 0 ? -1 : 0;
    }

    // time encoding 
    const n = dataset.length;

    for (let i = 0; i < n; i++) {
        dataset[i]["time"] = i / (n - 1);
    }

    // VOL10    
    
    const volWin = 100;
    let sum = 0;

    for (let i = 0; i < dataset.length; i++) {
        // use first candle's volume if not enough history
        const vol = i < volWin ? dataset[0].volume : dataset[i].volume;
        sum += vol;

        if (i >= volWin) {
            sum -= dataset[i - volWin].volume;
        }

        if (i < volWin - 1) {
            dataset[i].vol100 = dataset[0].volume; // repeat first candle
        } else {
            dataset[i].vol100 = sum / volWin;
        }
    }

    // normalize 0 -> 1
    let minV = Infinity;
    let maxV = -Infinity;

    for (let i = 0; i < dataset.length; i++) {
        const v = dataset[i].vol100;
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
    }

    const range = maxV - minV || 1;

    for (let i = 0; i < dataset.length; i++) {
        dataset[i].vol100 = (dataset[i].vol100 - minV) / range;
    }


    return dataset;
}

export default appendExtraData;