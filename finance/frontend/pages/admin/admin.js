const chartContainer = document.getElementById("chart-container");
const chart = new FinanceChart(chartContainer, {
    showMax: 100,
    offset: 0,
});
chart.setIndicators([
    { name: "ema", period: 20 },
    { name: "ema", period: 50 },
]);

const errorContainer = document.getElementById("error");
const relAccuracyContainer = document.getElementById("relAccuracy");
const predictionAccuracyContainer = document.getElementById("prediction-accuracy");
const signedErrorContainer = document.getElementById("signed-error"); // NEW

let paused = false;
let step = 0;
const range = 100;
const predictionLength = 50;

// Stats
const stats = {
    miss: {}, // { totalError, count, maxError, minError, errors: [] } absolute error
    signedMiss: {}, // { totalError, count, maxError, minError, errors: [] } signed error
    coveredCandles: 0,
    correctDirection: 0,
    relativeAccuracySum: 0,
};

const allDataResponse = await fetch("http://localhost:31198/api/sample?givenext=20&startindex=0");
const allData = await allDataResponse.json();
console.log("allData loaded:", allData.length, "candles");

function calcStdDev(arr) {
    const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
    const variance = arr.reduce((a,b)=>a + (b-mean)**2, 0)/arr.length;
    return Math.sqrt(variance);
}

async function stepChart() {
    if (step + range + predictionLength > allData.length) return false;

    const showData = allData.slice(step, step + range);
    const predictionResponse = await fetch(
        `http://localhost:31198/api/ai/predict?amount=${predictionLength}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                session: window.getSession(),
            },
            body: JSON.stringify(showData),
        }
    );

    const prediction = await predictionResponse.json();
    const nextData = allData.slice(step + range, step + range + predictionLength);

    const chartData = [...showData];

    for (let i = 0; i < prediction.length; i++) {
        const actualClose = Number(nextData[i].close);
        const predictedClose = Number(prediction[i]);

        chartData.push({
            open: nextData[i].open,
            high: nextData[i].high,
            low: nextData[i].low,
            close: actualClose,
            prediction: {
                open: predictedClose,
                high: predictedClose,
                low: predictedClose,
                close: predictedClose,
            },
        });

        // Original absolute % error
        const absErrorPercent = Math.abs(predictedClose - actualClose) / actualClose * 100;
        stats.miss[i] = stats.miss[i] || { totalError: 0, count: 0, maxError: 0, minError: Infinity, errors: [] };
        stats.miss[i].totalError += absErrorPercent;
        stats.miss[i].count += 1;
        stats.miss[i].maxError = Math.max(stats.miss[i].maxError, absErrorPercent);
        stats.miss[i].minError = Math.min(stats.miss[i].minError, absErrorPercent);
        stats.miss[i].errors.push(absErrorPercent);

        // NEW: Signed % error
        const signedErrorPercent = ((predictedClose - actualClose) / actualClose) * 100;
        stats.signedMiss[i] = stats.signedMiss[i] || { totalError: 0, count: 0, maxError: -Infinity, minError: Infinity, errors: [] };
        stats.signedMiss[i].totalError += signedErrorPercent;
        stats.signedMiss[i].count += 1;
        stats.signedMiss[i].maxError = Math.max(stats.signedMiss[i].maxError, signedErrorPercent);
        stats.signedMiss[i].minError = Math.min(stats.signedMiss[i].minError, signedErrorPercent);
        stats.signedMiss[i].errors.push(signedErrorPercent);

        // Relative accuracy (100 - |error|)
        stats.relativeAccuracySum += Math.max(0, 100 - absErrorPercent);

        // Track direction
        const prevActual = i === 0 ? showData[showData.length - 1].close : Number(nextData[i - 1].close);
        const actualUp = actualClose > prevActual;
        const actualDown = actualClose < prevActual;
        const predictedUp = predictedClose > prevActual;
        const predictedDown = predictedClose < prevActual;

        if ((actualUp && predictedUp) || (actualDown && predictedDown)) stats.correctDirection++;
    }

    stats.coveredCandles += prediction.length;
    chart.setData(chartData);

    if (step % 5 === 0) {
        // Original absolute error
        const loggingHTML = Object.entries(stats.miss)
            .filter(([idx]) => (Number(idx)+1) % 5 === 0)
            .map(([idx, data]) => {
                const avgError = data.totalError / data.count * 100;
                return `${Number(idx)+1}: ${avgError.toFixed(1)}%`;
            })
            .join("<br>");
        errorContainer.innerHTML = `Error stats per step:<br>${loggingHTML}`;

        // NEW: Signed error
        const signedHTML = Object.entries(stats.signedMiss)
            .filter(([idx]) => (Number(idx)+1) % 5 === 0)
            .map(([idx, data]) => {
                const avgSigned = data.totalError / data.count * 100;
                return `${Number(idx)+1}: ${avgSigned.toFixed(1)}%`;
            })
            .join("<br>");
        if(signedErrorContainer) signedErrorContainer.innerHTML = `Signed % error per step:<br>${signedHTML}`;

        relAccuracyContainer.innerHTML = `Average relative accuracy: ${(stats.relativeAccuracySum / stats.coveredCandles).toFixed(2)}%`;
        predictionAccuracyContainer.innerHTML = `Direction accuracy: ${Math.round(stats.correctDirection / stats.coveredCandles * 100)}%`;
    }

    step++;
    return true;
}

const stepTimeout = 200;

async function runStep() {
    if (!paused) {
        const hasMore = await stepChart();
        if (!hasMore) return;
    }
    setTimeout(runStep, stepTimeout);
}

runStep();

document.addEventListener("keydown", (e) => {
    if (e.key === " ") paused = !paused;
});
