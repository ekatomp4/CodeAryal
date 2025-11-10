import TradingApp from "../classes/TradingApp.js";
import Paper from "../classes/paper/Paper.js";
Paper.start();

// TODO rotating client & server keys

class TradingAppManager {
    static appList = {
        "paper" : new TradingApp({ 
            name: "paper",
            getFunctionList: Paper.getFunctionList.bind(Paper)
        })
    };

    static requiredFunctions = [
        "getBalance",        // Retrieve account balance
        "getPositions",      // List all open positions
        "getOrders",         // List all current/pending orders
        "placeOrder",        // Create a new order
        "cancelOrder",       // Cancel an order
        "authenticate",      // Handle login/session logic
        "refreshSession",    // Renew credentials when needed
        "instantBuy",        // buy at market price
        "instantSell" ,       // sell at market price
    ];
    // TODO give an easy way to access any app from here

    static openApp(name, credentials = {}) {
        const app = TradingAppManager.appList[name];
        if (!app) throw new Error(`Trading app ${name} not found`);
        return app.open(credentials);
    }

    static getAvailableApps() {
        return Object.keys(TradingAppManager.appList);
    }

    static getCommands() {
        return TradingAppManager.requiredFunctions;
    }
}


// const testTrader = TradingAppManager.openApp("paper");
// console.log(testTrader);
// paper is both a stock data source and a trading app

export default TradingAppManager;