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


        try {

            // PREDICT

            let predictions = await ai.predictNext(data, amount);

            // APPLY SMOOTHING

            const smoothingValue = volatilityToSmoothing(stats.volatility, 0.00005, 0.002, 0, 0.85);
            // console.log(`Smoothing value: ${smoothingValue}`);
            predictions = smoothSeries(predictions, smoothingValue);

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