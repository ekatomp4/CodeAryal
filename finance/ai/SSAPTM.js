// Sequential Smoothed Adaptive Prediction and Trading Model

import smoothSeries from "./nodes/smoothSeries.js";
import collectStatistics from "./nodes/collectStatistics.js";
import AI from "./AI.js"

const ai = new AI();
ai.loadSave(); // Load model
// ai.trainModel();


function volatilityToSmoothing(vol, minVol = 0.00005, maxVol = 0.002, minSmooth = 0, maxSmooth = 0.7) {
    const clamped = Math.max(minVol, Math.min(vol, maxVol));
    const normalized = 1 - (clamped - minVol) / (maxVol - minVol);
    return normalized * (maxSmooth - minSmooth) + minSmooth;
}


class SSAPTM {

    static getSampleData(giveNext, startIndex) {
        return ai.getSampleData(giveNext, startIndex);
    }

    constructor() {

    }

    async predictNext(data, amount) {
        const stats = collectStatistics(data);

        /*{
            count: 200,
            open: undefined,
            high: undefined,
            low: undefined,
            close: undefined,
            volume: undefined,
            returns: undefined,
            averageClose: 5308.365,
            averageVolume: 61802.7,
            minClose: 5290.75,
            maxClose: 5330.25,
            minHigh: 5291.5,
            maxHigh: 5336.75,
            minLow: 5289.75,
            maxLow: 5327,
            minOpen: 5290.75,
            maxOpen: 5330,
            totalUpMoves: 69,
            totalDownMoves: 60,
            averageReturn: 0.000010992537817650228,
            volatility: 0.0004765314659180843,
            bodySizeStats: { avg: 1.325, min: 0, max: 14 },
            wicksStats: { upperAvg: 0.1025, lowerAvg: 0.11875 }
        }
        */ 


        function gaussianCenterPull(predictions, strength = 0.5) {
            const n = predictions.length;
            const mean = predictions.reduce((a, b) => a + b, 0) / n;
        
            // gaussian parameters
            const center = (n - 1) / 2;
            const sigma = n / 4; 
        
            const result = [];
        
            for (let i = 0; i < n; i++) {
                const dist = i - center;
        
                // Gaussian weight: near the center = 1, edges = 0
                const weight = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        
                const pull = weight * strength;
        
                // Move prediction slightly toward Gaussian center (mean)
                result[i] = predictions[i] * (1 - pull) + mean * pull;
            }
        
            return result;
        }
        

        try {

            // PREDICT

            let predictions = await ai.predictNext(data, amount);

            // REMOVE FIRST DEVIATION

            const firstDeviation = predictions[0] - data[data.length - 1].close;
            predictions = predictions.map((prediction) => prediction - firstDeviation);

            // APPLY SMOOTHING

            const smoothingValue = volatilityToSmoothing(stats.volatility, 0.00005, 0.002, 0.05, 0.3);
            predictions = smoothSeries(predictions, smoothingValue); // 0.65 for sample data

            // APPLY GAUSSIAN RANDOM WALK PROBABILISTIC MODEL

            // predictions = gaussianCenterPull(predictions, 0.1); // DO NOT USE
            /*
            WITH 0.1:
            5: 7.09%
            10: 7.99%
            15: 12.00%
            20: 14.01%
            25: 18.08%
            30: 20.64%
            35: 21.72%
            40: 23.37%
            45: 20.83%
            50: 21.52%
            With 0.2: 
            5: 7.13%
            10: 7.93%
            15: 11.92%
            20: 13.68%
            25: 17.55%
            30: 19.98%
            35: 21.09%
            40: 22.87%
            45: 20.53%
            50: 21.35%
            NONE: 
            5: 7.07%
            10: 8.11%
            15: 12.18%
            20: 14.44%
            25: 18.75%
            30: 21.32%
            35: 22.38%
            40: 23.87%
            45: 21.12%
            50: 21.70%
            */




            return predictions;
        } catch (error) {
            console.error('Error in predictNext:', error);
            return [];
        }

    }

    async getDecision(data) { // buy or sell and what amount 
        const predictions = await this.predictNext(data, 10);
        
    }
}

export default SSAPTM