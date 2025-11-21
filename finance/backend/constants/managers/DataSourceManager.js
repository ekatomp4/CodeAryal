import DataSource from "../classes/DataSource.js";
import Paper from "../classes/paper/Paper.js";
import axios from "axios";

function yahooFormatter(yahooData) {
    if (!yahooData.chart || !yahooData.chart.result || !yahooData.chart.result[0]) {
        throw new Error("Invalid Yahoo data structure");
    }

    const result = yahooData.chart.result[0];
    const timestamps = result.timestamp || [].fill(0, 0, result.indicators.quote[0].length);
    const quote = result.indicators.quote[0];


    const formatted = timestamps.map((ts, i) => {
        const openVal = quote.open[i];
        const highVal = quote.high[i];
        const lowVal = quote.low[i];
        const closeVal = quote.close[i];
        const volumeVal = quote.volume[i];


        // const adjcloseVal = closeVal;
        const hasAdjclose = result?.indicators?.adjclose?.length > 0;
        const adjcloseVal = (hasAdjclose && result?.indicators?.adjclose[0]?.adjclose[i]) ? result?.indicators?.adjclose[0]?.adjclose[i] : closeVal;
        
        if (openVal === null || highVal === null || lowVal === null || closeVal === null || volumeVal === null || adjcloseVal === null) {
            return null;
        }

        
        return {
            date: ts,
            open: openVal,
            high: highVal,
            low: lowVal,
            close: closeVal,
            volume: volumeVal,
            adjclose: adjcloseVal  // Yahoo does not always return adjclose separately; use close if not available
        };
    }).filter(tick => tick !== null);

    // Optional: reverse to have oldest first if needed
    // return formatted.reverse();

    return formatted;
}

 

const DataSourceList = {
    yahoo: new DataSource({ 
        coreURL: "https://query1.finance.yahoo.com/v8/finance/chart/",
        getter: async ({ symbol, interval, range }) => {
            const data = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`);
            return data;
        },
        formatter: yahooFormatter,
        
        validRanges: ["1d", "1wk","1mo","3mo","6mo","ytd","1y","2y","5y","10y","max"],
        validIntervals: ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "4h", "1d", "5d", "1wk", "1mo", "3mo"]
    }),
}

const PAPERDATA = new DataSource({ 
    coreURL: "paper-simulator",
    getter: async ({ symbol, interval, range }) => {
        // If you want to simulate paper trading instead of real Yahoo data:
        const simulatedData = Paper.data; // use the Paper simulation
        return { data: simulatedData };
    },
    formatter: (data) => {
        // Paper simulation data already matches StockPoint format
        return data;
    },
    validRanges: ["1mo","3mo","6mo","ytd","1y","2y","5y","10y","max"]
})

class DataSourceManager {
    static getDataSource(name) {
        return DataSourceList[name];
    }

    // TODO make this auto set active data source, fallbacks, and if responses have errors go to fallback and wait

    static getCurrentActive() {
        // return the first datasource that isActive
        return Object.values(DataSourceList).find((ds) => ds.isActive);
    }

    static async getStockData({ symbol, interval, range }, step = 0) {
        
        if(symbol === "PAPER") {
            return PAPERDATA.getStockData({ symbol, interval, range });
        }

        let data;
        try {
            data = await DataSourceManager.getCurrentActive().getStockData({ symbol, interval, range });
        } catch (error) {
            if(step >= Object.values(DataSourceList).length) {
                throw new Error("All data sources failed");
            }
            // on error, pause current and try next active
            DataSourceManager.getCurrentActive().pause();
            data = await DataSourceManager.getStockData({ symbol, interval, range }, step + 1);
        }
        return data;
    }


    static async getSolanaData(address) {
        if(!address) return null;
        const ids = [address];
        const url = `https://lite-api.jup.ag/price/v3?ids=${ids.join(',')}`;
      
        try {
          const res = await axios.get(url);
          const data = res.data;

          if(data[address]) {
            return data[address];
          }
        } catch (err) {
          console.error('Error fetching SOL price:', err.response?.data ?? err.message);
        }
      
        return null;
    }
}

export default DataSourceManager;