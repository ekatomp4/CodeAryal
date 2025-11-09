import DataSource from "./classes/DataSource.js";
import axios from "axios";

function yahooFormatter(yahooData) {
    if (!yahooData.chart || !yahooData.chart.result || !yahooData.chart.result[0]) {
        throw new Error("Invalid Yahoo data structure");
    }

    const result = yahooData.chart.result[0];
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    const formatted = timestamps.map((ts, i) => ({
        date: ts,
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i],
        adjclose: quote.close[i]  // Yahoo does not always return adjclose separately; use close if not available
    }));

    // Optional: reverse to have oldest first if needed
    return formatted.reverse();
}

 

const DataSourceList = {
    yahoo: new DataSource({ 
        coreURL: "https://query1.finance.yahoo.com/v8/finance/chart/",
        getter: async ({ symbol, interval, range }) => {
            return await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`);
        },
        formatter: yahooFormatter,
        validRanges: ["1mo","3mo","6mo","ytd","1y","2y","5y","10y","max"]
    })
}

class DataSourceManager {
    static getDataSource(name) {
        return DataSourceList[name];
    }

    // TODO make this auto set active data source, fallbacks, and if responses have errors go to fallback and wait

    static getCurrentActive() {
        // return the first datasource that isActive
        return Object.values(DataSourceList).find((ds) => ds.isActive);
    }

    static getStockData({ symbol, interval, range }) {
        return DataSourceManager.getCurrentActive().getStockData({ symbol, interval, range });
    }
}

export default DataSourceManager;