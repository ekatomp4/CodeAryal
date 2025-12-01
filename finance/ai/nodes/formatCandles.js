import TRAINING_PARAMS from "./TRAINING_PARAMS.js";

function formatCandles(candles) {
  const out = [];
  for (let i = 0; i < candles.length; i++) {
    for (const f of TRAINING_PARAMS.inputFeatures) {
      out.push(candles[i][f]);
    }
  }
  return out;
}

export default formatCandles;