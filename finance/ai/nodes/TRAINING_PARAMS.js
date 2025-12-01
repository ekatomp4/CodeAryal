
const TRAINING_PARAMS = {
  data_range: 100,  // best 150
  epochs: 100,
  slices_per_epoch: 10, // best 10
  dropout_percent: 0, // best 0
  sample_amount: 1, // best 1

  inputFeatures: ["open", "high", "low", 'close', 'time', "volume", "rsi", "returnPct", "movement"], // best OHLC + time
  inputIgnoreNormalization: ["movement"],
  inputWeights: {
    "movement": 0.5 // best 0.5
  },

  smoothing: 0, // best 0, smooth predictions

  validation_split: 0.2, // is the rate of data used for validation
  shuffle: false,

  // [type, units, activation fn, {extras}]
  // 1 -> 2 -> 4 -> 8 -> 16 -> 32 -> 64 -> 128 -> 256 -> 512 -> 1024 -> 2048 -> 4096 -> 8192
  layerDesign: [
    ["dense", 512, "gelu"], // best 128
    ["dense", 256, "gelu"], // pattern recog start
    ["dense", 128, "gelu"], // best 128
    ["dense", 64, "gelu"], // best 64
  ]
  // NOTE: 16 is too low to capture detail
  // NOTE: 8192 takes too long
  // NOTE: hardsigmoid and linear are too simple
};
// 'elu' | 'hardSigmoid' | 'linear' | 'relu' | 'relu6' | 'selu' | 'sigmoid' | 'softmax' | 'softplus' | 'softsign' | 'tanh' | 'swish' | 'mish' | 'gelu' | 'gelu_new';
// 1 swish layer has hard downwards trend with occasional wobbly snaps to accurate pattern

const PRODUCTION_MODELS = {
    "EKAT1.0": {
        layerDesign: [["dense", 512, "gelu"],["dense", 256, "gelu"],["dense", 128, "gelu"],["dense", 64, "gelu"]],
        inputWeights: {"movement": 0.5},
        smoothing: 0,
        inputFeatures: ["open", "high", "low", 'close', 'time', "volume", "rsi", "returnPct", "movement"],
        inputIgnoreNormalization: ["movement"],
        data_range: 100
    }
}
const CURRENT_MODEL = "EKAT1.0";


if(CURRENT_MODEL) Object.assign(TRAINING_PARAMS, PRODUCTION_MODELS[CURRENT_MODEL]);


export default TRAINING_PARAMS;