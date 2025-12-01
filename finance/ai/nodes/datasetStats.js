class datasetStats {
    constructor(dataset) {
        this.dataset = dataset;
        // [{open, close, high, low}]

        this.max = this.dataset.reduce((a, b) => a + b.high, 0) / this.dataset.length;
        this.min = this.dataset.reduce((a, b) => a + b.low, 0) / this.dataset.length;
        
    }
}

export default datasetStats;