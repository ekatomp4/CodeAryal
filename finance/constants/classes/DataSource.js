import axios from "axios";

class DataSource {

    static checkData(data) {
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            if (
                item.date === undefined || item.date === null ||
                item.open === undefined || item.open === null ||
                item.high === undefined || item.high === null ||
                item.low === undefined || item.low === null ||
                item.close === undefined || item.close === null ||
                item.volume === undefined || item.volume === null ||
                item.adjclose === undefined || item.adjclose === null
            ) {
                return `Invalid data: ${JSON.stringify(item)}, index: ${i}`;
            }
        }
        return true;
    }


    constructor({ coreURL, getter, formatter, validRanges }) {
        this.coreURL = coreURL;
        this.getter = getter;
        this.formatter = formatter || ((data) => data);

        this.validRanges = validRanges || [];


        this.isActive = true;

        return this;
    }

    activate() {
        this.isActive = true;
    }

    deactivate() {
        this.isActive = false;
    }

    pause() {
        this.deactivate();
        setTimeout(() => this.activate(), 5000);
    }


    async getStockData({ symbol, interval, range }) {

        if (!this.validRanges.includes(range) && this.validRanges.length) throw new Error(`Invalid range: ${range}`);

        const response = await this.getter({
            symbol,
            interval,
            range
        })

        const formatted = this.formatter(response.data);
        const isCorrect = DataSource.checkData(formatted);

        if(!isCorrect === true) throw new Error(isCorrect);
        return formatted;
    }

}


export default DataSource;