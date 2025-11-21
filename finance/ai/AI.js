import fs from "fs";
import path from "path";
import tf, { add } from '@tensorflow/tfjs-node';
import crypto from "crypto";


const seed = "0";

function rand(additionalSeed = "") {
  additionalSeed = String(additionalSeed);
  const hash = crypto.createHash('sha256').update(seed + additionalSeed).digest('hex');
  const intVal = parseInt(hash.slice(0, 8), 16);
  return intVal / 0xffffffff; // normalize to [0, 1]
}


function appendExtraData(dataset) {
  const period = 50;
  let multiplier = 2 / (period + 1);
  let emaPrev = dataset[0].close; // start EMA with first close

  for (let i = 0; i < dataset.length; i++) {
    const close = dataset[i].close;
    const ema = (close - emaPrev) * multiplier + emaPrev;
    dataset[i].ema50 = ema;
    emaPrev = ema;
  }

  return dataset;
}

const modelSavePath = './ai/model/';
const trainingDataFolder = "./training-data/";
const datasets = ["XBTUSD", "ETHUSD", "XRPUSD"];

const TRAINING_PARAMS = {
  data_range: 100,
  slices_per_epoch: 10,
  dropout_percent: 0,

  inputFeatures: ['open', 'high', 'low', 'close'],
  inputWeights: [1, 1, 1, 1],
};

let loadedDataSets = {};
async function loadDatasets() {
  if (Object.keys(loadedDataSets).length > 0) return loadedDataSets;
  const files = fs.readdirSync(trainingDataFolder);

  for (const file of files) {
    if (path.extname(file) !== '.json') continue;
    const filePath = path.join(trainingDataFolder, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const datasetName = path.basename(file, '.json');
      loadedDataSets[datasetName] = data.map(c => ({ ...c, date: new Date(c.date) }));
      console.log(`Loaded ${data.length} candles from ${file}`);
    } catch (err) {
      console.error(`Error loading ${file}:`, err);
    }
  }
  return loadedDataSets;
}


function normalize(data) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  return data.map(x => (x - min) / (max - min));
}
// function normalize(data) {
//   const mean = data.reduce((a,b) => a+b, 0) / data.length;
//   const std = Math.sqrt(data.reduce((a,b) => a + (b-mean)**2, 0) / data.length);
//   return data.map(x => std === 0 ? 0 : (x - mean)/std);
// }
function normalizeSlice(slice) {
  const result = [];

  // For each feature, normalize across the slice
  const normalizedFeatures = {};
  for (let i = 0; i < TRAINING_PARAMS.inputFeatures.length; i++) {
    const feature = TRAINING_PARAMS.inputFeatures[i];
    const weight = TRAINING_PARAMS.inputWeights[i] ?? 1; // default to 1
    const values = slice.map(c => c[feature] ?? 0); // fallback to 0 if missing
    const min = Math.min(...values);
    const max = Math.max(...values);
    // normalize and apply weight
    const normalizedValues = values.map(v => (max === min ? 0 : (v - min) / (max - min)) * weight);
    normalizedFeatures[feature] = normalizedValues;
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

  async trainModel({ epochs = 100 } = {}) {
    await loadDatasets();
    const dataRange = TRAINING_PARAMS.data_range;

    const X_list = [];
    const y_list = [];
    const symbols = datasets;

    for (let i = 0; i < epochs; i++) {
      for (let j = 0; j < TRAINING_PARAMS.slices_per_epoch; j++) {
        const symbol = symbols[Math.floor(rand(seed + i + j) * symbols.length)];
        // const candles = loadedDataSets[symbol];
        const candles = appendExtraData(loadedDataSets[symbol]);

        if (!candles || candles.length <= dataRange) continue;

        const startIdx = Math.floor(rand(seed + i + j) * (candles.length - dataRange));
        const slice = candles.slice(startIdx, startIdx + dataRange);

        // normalize the slice for training
        const normalizedSlice = normalizeSlice(slice);
        const featuresArray = TRAINING_PARAMS.inputFeatures.map(feature => normalizedSlice.map(c => c[feature]));
        const inputFlat = featuresArray.flat();
        X_list.push(inputFlat);

        // use relative change for y
        const nextClose = candles[startIdx + dataRange].close;
        const lastClose = slice[slice.length - 1].close;
        const normalizedNext = (nextClose - lastClose) / lastClose;
        y_list.push(normalizedNext);
      }
    }

    if (X_list.length === 0) throw new Error('No training data available');

    const inputSize = dataRange * TRAINING_PARAMS.inputFeatures.length;
    const X = tf.tensor2d(X_list, [X_list.length, inputSize]);
    const y = tf.tensor2d(y_list, [y_list.length, 1]);

    const model = tf.sequential();
    
    // input
    model.add(tf.layers.dense({ units: 256, inputShape: [inputSize], activation: 'relu' }));

    // simplifying & expansion
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));

    if (TRAINING_PARAMS.dropout_percent > 0) {
      model.add(tf.layers.dropout({ rate: TRAINING_PARAMS.dropout_percent }));
    } 

    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));

    // output

    model.add(tf.layers.dense({ units: 1 }));

    model.compile({
      optimizer: tf.train.adam(),
      loss: 'meanSquaredError',
      metrics: ['mse'],
    });

    await model.fit(X, y, {
      epochs,
      batchSize: 32,
      shuffle: true
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
    const featuresArray = TRAINING_PARAMS.inputFeatures.map(feature => normalizedSlice.map(c => c[feature]));
    const inputFlat = featuresArray.flat();

    if (!this.model) {
      console.log('Model not loaded');
      return;
    }

    const inputTensor = tf.tensor2d([inputFlat], [1, TRAINING_PARAMS.data_range * TRAINING_PARAMS.inputFeatures.length]);
    const predictedChange = this.model.predict(inputTensor).dataSync()[0];

    // reconstruct absolute price
    const lastClose = slice[slice.length - 1].close;
    const predictedPrice = lastClose * (1 + predictedChange);

    return predictedPrice; // Already absolute price
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
