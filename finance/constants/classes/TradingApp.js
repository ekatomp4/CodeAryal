
class TradingApp {

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

    constructor({ name, getFunctionList = {} }) {
        this.name = name;
        this.getFunctionList = getFunctionList; // each key should be a callable function
        this.session = null;    // optional session info

        // Verify all required functions are implemented
        // TradingApp.requiredFunctions.forEach((funcName) => {
            
        // });
    }

    open(credentials = {}) {
        return this.getFunctionList(credentials);
    }
}

export default TradingApp;