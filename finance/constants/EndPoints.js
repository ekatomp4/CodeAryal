import SessionManager from "../modules/SessionManager.js";
import axios from "axios";

import DataSourceManager from "./managers/DataSourceManager.js";
import TradingAppManager from "./managers/TradingAppManager.js";

class EndPoints {
    static list = {
        "newSession": {
            "method": "get",
            "path": "/newSession",
            "handler": (req, res) => {
                return SessionManager.createSession();
            },
            public: true
        },

        "stock": {
            "method": "get",
            "path": "/stock/:symbol",
            "handler": async (req, res) => {
                const symbol = req.params.symbol;
                const interval = req.query.interval || "1d";
                const range = req.query.range || "1mo";
        
                // Only return the data property from axios
                const response = await DataSourceManager.getStockData({ symbol, interval, range });
                return response;
            }
        },


    }

    static init(app) {
        // middleware to check session unless public endpoint
        function checkSession(req, res, next) {
            const session = req.headers.session;
        
            // Convert object to array for find
            const selectedEndpoint = Object.values(EndPoints.list).find(ep => {
                // naive matching for paths with params
                const basePath = ep.path.replace(/:\w+/g, ""); // remove :param
                return req.path.startsWith(basePath);
            });
        
            if (selectedEndpoint && selectedEndpoint.public) return next();
        
            if (session) {
                if (SessionManager.checkSession(session)) {
                    next();
                } else {
                    res.status(401).json({ error: "Unauthorized" });
                }
            } else {
                res.status(401).json({ error: "Unauthorized" });
            }
        }
        app.use(checkSession);

        // endpoints
        for (const endpoint in EndPoints.list) {
            const route = EndPoints.list[endpoint];
            app[route.method](route.path, async (req, res) => {
                try {
                    const returnData = await route.handler(req, res);
                    res.send(returnData);
                } catch (err) {
                    res.status(500).json({ error: err.message });
                }
            });
        }
    }
}

export default EndPoints;
