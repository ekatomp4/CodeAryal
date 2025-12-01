import fs from "fs";
import path from "path";
import tf, { add, data } from '@tensorflow/tfjs-node';
import crypto from "crypto";
import datasetStats from "./nodes/datasetStats.js";


import smoothCandles from "./nodes/smoothCandles.js";
import formatCandles from "./nodes/formatCandles.js";
import TRAINING_PARAMS from "./nodes/TRAINING_PARAMS.js";
import appendExtraData from "./nodes/appendExtraData.js";


const seed = "0";

function rand(additionalSeed = "") {
  additionalSeed = String(additionalSeed);
  const hash = crypto.createHash('sha256').update(seed + additionalSeed).digest('hex');
  const intVal = parseInt(hash.slice(0, 8), 16);
  return intVal / 0xffffffff; // normalize to [0, 1]
}



const OHLC = ["open", "high", "low", "close"];
const modelSavePath = './ai/model/';
const trainingDataFolder = "./training-data/";
const datasets = ["XBTUSD", "ETHUSD", "XRPUSD"];



function countNeurons(layerDesign, featureCount, outputCount) {
  let total = 0;

  // input layer neurons
  total += featureCount;

  // hidden layers
  for (const layer of layerDesign) {
    const units = layer[1];
    total += units;
  }

  // output layer neurons
  total += outputCount;

  return total;
}
console.log("Neurons:", countNeurons(TRAINING_PARAMS.layerDesign, 5, 1));

let loadedDataSets = {};
let loadedDataSetsStats = {};
async function loadDatasets() {
  if (Object.keys(loadedDataSets).length > 0) return loadedDataSets;
  const files = fs.readdirSync(trainingDataFolder);

  for (const file of files) {
    if (path.extname(file) !== '.json') continue;
    const filePath = path.join(trainingDataFolder, file);
    try {
      let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const datasetName = path.basename(file, '.json');
      loadedDataSets[datasetName] = data.map(c => ({ ...c, date: new Date(c.date) }));
      console.log(`Loaded ${data.length} candles from ${file}`);
    } catch (err) {
      console.error(`Error loading ${file}:`, err);
    }
  }

  for (const datasetName in loadedDataSets) {
    const data = loadedDataSets[datasetName];
    loadedDataSetsStats[datasetName] = new datasetStats(data);
  }

  return loadedDataSets;
}


function normalizeSlice(slice) {
  const result = [];
  const averagePrice = slice.reduce((a, b) => a + b.close, 0) / slice.length;
  const maxPrice = Math.max(...slice.map(c => c.high));
  const minPrice = Math.min(...slice.map(c => c.low));

  const normalizedFeatures = {};

  // sanitize, scan for null or undefined, make sure all are numbers
  // sanitize, scan for null or undefined, make sure all are numbers
  for (const feature in normalizedFeatures) {
    normalizedFeatures[feature] = normalizedFeatures[feature].map((v, i) => {
      if (typeof v !== 'number' || v === null || v === undefined) {
        throw new Error(`Invalid value at index ${i} for key ${feature}: ${v}`);
      }
      return v;
    });
  }

  // ohlc
  for (const feature of OHLC) {
    const values = slice.map(c => c[feature] ?? 0); // fallback to 0 if missing
    const min = minPrice;
    const max = maxPrice;
    // normalize and apply weight
    const normalizedValues = values.map(v => (max === min ? 0 : (v - min) / (max - min)));
    normalizedFeatures[feature] = normalizedValues;
  }

  // volume
  const maxVol = 2.1e9; // 2.1billion = max ever recorded
  const minVol = 0;
  const values = slice.map(c => c.volume ?? 0); // fallback to 0 if missing
  const normalizedValues = values.map(v => (maxVol === minVol ? 0 : (v - minVol) / (maxVol - minVol)));
  normalizedFeatures['volume'] = normalizedValues;


  // auto
  for (let i = 0; i < TRAINING_PARAMS.inputFeatures.length; i++) {
    const feature = TRAINING_PARAMS.inputFeatures[i];
    if (feature === 'volume') continue;
    if (TRAINING_PARAMS.inputIgnoreNormalization.includes(feature)) {
      normalizedFeatures[feature] = slice.map(c => c[feature]);
      continue;
    };
    if (OHLC.includes(feature)) continue;
    const values = slice.map(c => c[feature] ?? 0); // fallback to 0 if missing
    const min = Math.min(...values);
    const max = Math.max(...values);
    // normalize and apply weight
    const normalizedValues = values.map(v => (max === min ? 0 : (v - min) / (max - min)));
    normalizedFeatures[feature] = normalizedValues;
  }

  // apply weights
  for (const feature of Object.keys(normalizedFeatures)) {
    const weight = TRAINING_PARAMS.inputWeights[feature] ?? 1;
    if(weight === 1) continue;
    normalizedFeatures[feature] = normalizedFeatures[feature].map(v => v * weight);
  }

  // Rebuild each candle with normalized & weighted features
  for (let i = 0; i < slice.length; i++) {
    const normalizedCandle = {};
    for (const feature of TRAINING_PARAMS.inputFeatures) {
      normalizedCandle[feature] = normalizedFeatures[feature][i];
    }
    result.push(normalizedCandle);
  }

  return result;
}


class AI {
  constructor() {
    this.model = null; // store loaded/trained model
  }

  async loadSave() {
    // load
    const model = await tf.loadLayersModel('file://' + modelSavePath + 'model.json');
    console.log(`Model loaded from ${modelSavePath}`);
    this.model = model;
    return model;
  }

  async trainModel({ epochs = TRAINING_PARAMS.epochs } = {}) {
    await loadDatasets();
    const dataRange = TRAINING_PARAMS.data_range;

    const X_list = [];
    const y_list = [];
    const symbols = datasets;

    for (let i = 0; i < epochs; i++) {
      for (let j = 0; j < TRAINING_PARAMS.slices_per_epoch; j++) {
        const symbol = symbols[Math.floor(rand(seed + i + j) * symbols.length)];
        let candles = loadedDataSets[symbol];

        // manipulate data
        candles = smoothCandles(candles, TRAINING_PARAMS.smoothing);
        candles = appendExtraData(candles);

        if (!candles || candles.length <= dataRange) continue;

        const startIdx = Math.floor(rand(seed + i + j) * (candles.length - dataRange));
        const slice = candles.slice(startIdx, startIdx + dataRange);

        // normalize the slice for training
        // const normalizedSlice = normalizeSlice(slice);
        // const featuresArray = TRAINING_PARAMS.inputFeatures.map(feature => normalizedSlice.map(c => c[feature]));
        // const inputFlat = featuresArray.flat();
        // X_list.push(inputFlat);
        const normalizedSlice = normalizeSlice(slice);
        const inputFlat = formatCandles(normalizedSlice);
        X_list.push(inputFlat);

        // use relative change for y
        const nextClose = candles[startIdx + dataRange].close;
        const lastClose = slice[slice.length - 1].close;
        const normalizedNext = (nextClose - lastClose) / lastClose; // relative change
        // console.log("NORMALIZED NEXT:", normalizedNext);
        y_list.push(normalizedNext);
      }
    }

    if (X_list.length === 0) throw new Error('No training data available');

    const inputSize = dataRange * TRAINING_PARAMS.inputFeatures.length;
    const X = tf.tensor2d(X_list, [X_list.length, inputSize]);
    const y = tf.tensor2d(y_list, [y_list.length, 1]);


    const seqLen = TRAINING_PARAMS.data_range; // 150
    const featCount = TRAINING_PARAMS.inputFeatures.length; // 5
    const flatSize = seqLen * featCount; // 150 * 5 = 750

    console.log("SEQ LEN:", seqLen);
    console.log("FEATURE COUNT:", featCount);
    console.log("TARGET SHAPE PRODUCT:", seqLen * featCount);

    const model = tf.sequential();

    // input
    model.add(tf.layers.dense({ units: flatSize, inputShape: [flatSize], activation: 'relu' }));


    // hidden    

    if (TRAINING_PARAMS.dropout_percent > 0) {
      model.add(tf.layers.dropout({ rate: TRAINING_PARAMS.dropout_percent }));
    }

    // model.add(tf.zeros)

    // reshape to 3D for LSTM: [batchSize, seqLen, featCount]
    // model.add(tf.layers.reshape({
    //   targetShape: [seqLen, featCount] // [150, 5]
    // }));

    // // LSTM layer to capture temporal dependencies
    // model.add(tf.layers.gru({
    //   units: 32,
    //   returnSequences: true,
    //   activation: 'tanh',
    //   recurrentActivation: 'sigmoid'
    // }));
    // // model.add(tf.layers.flatten());

    // model.add(tf.layers.flatten()); // now total size = seqLen*64


    for (let i = 0; i < TRAINING_PARAMS.layerDesign.length; i++) {
      const layer = TRAINING_PARAMS.layerDesign[i];
      const layerExtras = layer[3];
      model.add(tf.layers[layer[0]]({ units: layer[1], activation: layer[2], ...layerExtras }));
    }

    // output

    model.add(tf.layers.dense({ units: 1 }));

    model.compile({
      optimizer: tf.train.adam(),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });


    await model.fit(X, y, {
      epochs,
      batchSize: 128, // could be 32, increases ram usage but faster
      shuffle: TRAINING_PARAMS.shuffle, // shuffle the data
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const RAMUsage = process.memoryUsage().rss / 1024 / 1024; // MB
          const RAMUsageGB = process.memoryUsage().rss / 1024 / 1024 / 1024; // GB
          console.log(`RAM Usage: ${RAMUsage.toFixed(0)} MB (${RAMUsageGB.toFixed(2)} GB)`);
        }
      },
      validationSplit: TRAINING_PARAMS.validation_split,
      verbose: 1
    });

    await model.save('file://' + modelSavePath);
    this.model = model;
    return model;
  }

  async predict(data) {
    if (!data || data.length < TRAINING_PARAMS.data_range) return null;

    // normalize the input slice for prediction
    let slice = data.slice(-TRAINING_PARAMS.data_range);
    slice = appendExtraData(slice);
    const normalizedSlice = normalizeSlice(slice);
    // const inputFlat = normalizedSlice.flatMap(c => [c.open, c.high, c.low, c.close]);
    // const featuresArray = TRAINING_PARAMS.inputFeatures.map(feature => normalizedSlice.map(c => c[feature]));
    // const inputFlat = featuresArray.flat();

    const inputFlat = formatCandles(normalizedSlice);

    if (!this.model) {
      console.log('Model not loaded');
      return;
    }

    const inputTensor = tf.tensor2d([inputFlat], [1, TRAINING_PARAMS.data_range * TRAINING_PARAMS.inputFeatures.length]);

    const allPredictions = [];
    const sample_amount = TRAINING_PARAMS.sample_amount;
    for(let i = 0; i < sample_amount; i++) {
      const predictedChange = this.model.predict(inputTensor).dataSync()[0];
        // reconstruct absolute price
      const lastClose = slice[slice.length - 1].close;
      const predictedPrice = lastClose * (1 + predictedChange);
      allPredictions.push(predictedPrice);
    }


    const finalPredictedPrice = allPredictions.reduce((a, b) => a + b, 0) / sample_amount;
  

    return finalPredictedPrice; // Already absolute price
  }

  async predictNext(data, amount = 10) {
    try {
      const newPredictions = [];
      const lastReal = data[data.length - 1];

      let tempData = [...data]; // copy for multi-step predictions

      for (let i = 0; i < amount; i++) {
        const next = await this.predict(tempData); // raw prediction
        newPredictions.push(next);

        // push raw prediction into tempData for multi-step
        tempData.push({
          open: next,
          high: next,
          low: next,
          close: next,
          volume: lastReal.volume
        });
      }

      return newPredictions;
    } catch (error) {
      console.error('Error in predictNext:', error);
      return [];
    }
  }


  async getSampleData(giveNext = 10, start = null) {
    await loadDatasets();
    // BTC-PERPETUAL XBTUSD ETHUSD XRPUSD
    const symbol = "BTC-PERPETUAL";
    const candles = loadedDataSets[symbol];
    // TODO FIX THIS SENDING EVERY BIT OF DATA

    const range = candles.length;//TRAINING_PARAMS.data_range;
    const maxStart = candles.length - range - giveNext;
    let startIndex = start ?? Math.floor(Math.random() * maxStart);

    let startCandles = candles.slice(startIndex, startIndex + range);

    return startCandles;
  }
}

export default AI;

