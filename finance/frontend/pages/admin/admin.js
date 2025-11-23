const chartContainer = document.getElementById("chart-container");
const chart = new FinanceChart(chartContainer, {
    showMax: 100,
    offset: 0,
});
chart.setIndicators([
    {
        name: "ema",
        period: 20,
    },
    {
        name: "ema",
        period: 50,
    },
    // {
    //     name: "ema",
    //     period: 100,
    // },
]);
const errorContainer = document.getElementById("error");
const shotsContainer = document.getElementById("shots");
const predictionAccuracyContainer = document.getElementById("prediction-accuracy");

let paused = false;
let step = 0;
const range = 200;
const predictionLength = 50;


// stats to track error per prediction step
const stats = {
    miss: {}, // will store { totalError, count } per prediction index
    coveredCandles: 0,
    undershot: 0,
    overshot: 0,
    correctDirection: 0
};

const allDataResponse = await fetch("http://localhost:31198/api/sample?givenext=20&startindex=0");
const allData = await allDataResponse.json();
console.log("allData loaded:", allData.length, "candles");

async function stepChart() {
    if (step + range + predictionLength > allData.length) return;

    // Prepare data for prediction
    const showData = allData.slice(step, step + range);

    // Get predictions
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

    // TODO measure undershoot or overshoot percent
    const prediction = await predictionResponse.json();
    // console.log("prediction:", prediction);

    const nextData = allData.slice(step + range, step + range + predictionLength);

    // Push actual + predicted to chart, and calculate error
    const chartData = [...showData]; // start with historical data

    for (let i = 0; i < prediction.length; i++) {
        const actualClose = Number(nextData[i].close);
        const predictedClose = Number(prediction[i]);

        // push to chart
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

        const absThreshold = 10;      // $20
        const percentThreshold = 0.05; // 0.5%

        if (predictedClose > actualClose * (1 + percentThreshold / 100) && predictedClose > actualClose + absThreshold) stats.overshot += 1;
        if (predictedClose < actualClose * (1 - percentThreshold / 100) && predictedClose < actualClose - absThreshold) stats.undershot += 1;

        // Track absolute percentage error
        stats.miss[i] = stats.miss[i] || { totalError: 0, count: 0 };
        const errorPercent = Math.abs(predictedClose - actualClose) / actualClose * 100;
        stats.miss[i].totalError += errorPercent;
        stats.miss[i].count += 1;


        // Track direction accuracy

        // if(i>20) continue; // cap at 20

        const prevActual = i === 0
            ? showData[showData.length - 1].close  // last known real candle
            : Number(nextData[i - 1].close);       // previous future candle

        const actualUp = actualClose > prevActual;
        const actualDown = actualClose < prevActual;

        const predictedUp = predictedClose > prevActual;
        const predictedDown = predictedClose < prevActual;

        if ((actualUp && predictedUp) || (actualDown && predictedDown)) {
            stats.correctDirection++;
        }

    }

    stats.coveredCandles += prediction.length;

    // Update chart
    chart.setData(chartData);

    // Log average % error every few steps
    if (step % 5 === 0) {
        const averageError = {};
        for (const [key, value] of Object.entries(stats.miss)) {
            averageError[key] = value.totalError / value.count * 100;
        }
        // logging
        const loggingHTML = Object.values(averageError)
            .map((error, idx) => ({ idx, error }))  // keep index for filtering
            .filter(item => (item.idx + 1) % 5 === 0) // show only every 5th step
            .map(item => `${item.idx + 1}: ${item.error.toFixed(2)}%`)
            .join("<br>");

        errorContainer.innerHTML = `Average % error per prediction step (every 5 steps):<br>${loggingHTML}`;

        // Covered candles: ${stats.coveredCandles}
        shotsContainer.innerHTML = `
        Undershot candles: ${stats.undershot}<br>
        Overshot candles: ${stats.overshot}<br>`;

        // Prediction accuracy: ${stats.correctDirection / stats.coveredCandles * 100}%<br>
        predictionAccuracyContainer.innerHTML = `
        Prediction accuracy: ${Math.round(stats.correctDirection / stats.coveredCandles * 100)}%<br>
        `;
    }

    step++;
}

// Start stepping
stepChart();
setInterval(() => {
    if (!paused) stepChart();
}, 300);

document.addEventListener("keydown", (e) => {
    if (e.key === " ") paused = !paused;
});
