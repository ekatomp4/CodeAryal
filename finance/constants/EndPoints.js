import SessionManager from "../modules/SessionManager.js";


import axios from "axios";

import DataSourceManager from "./managers/DataSourceManager.js";
import TradingAppManager from "./managers/TradingAppManager.js";

class EndPoints {
    static list = {
        "getSession": {
            "method": "get",
            "path": "/getSession",
            "handler": (req, res) => {
                // dynamically create a sessio or update an existing one, thenr return it
                const account = { name: req.query.name, password: req.query.password };
                return SessionManager.createSession({ account }); // TODO auto replenish
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

        // getting and accessing apps

        "app": {
            "method": "get",
            "path": "/app",
            "handler": (req, res) => {
                res.status(404).json({ error: `No app specified, try /app/[name]/[command], available: ${TradingAppManager.getAvailableApps().join(", ")}` });
            }
        },
        "appWithApp": {
            "method": "get",
            "path": "/app/:name",
            "handler": (req, res) => {
                res.status(404).json({ error: `Command not specified, try /app/[name]/[command], available: ${TradingAppManager.getCommands().join(", ")}` });
            }
        },
        "appWithCommand": {
            "method": "get",
            "path": "/app/:name/:command",
            "handler": (req, res) => {
                const { name, command } = req.params;
                const session = req.headers['session']; // or req.get('session')

                if(!command) return res.status(404).json({ error: `Command not found, try /app/[name]/[command], available: ${TradingAppManager.getCommands().join(", ")}` });

                const validApps = TradingAppManager.getAvailableApps();
                if (!validApps.includes(name)) return res.status(404).json({ error: "App not found" });

                const sessionCredentials = SessionManager.getSession(session);
                if(!sessionCredentials[name]) return res.status(401).json({ error: "You do not have access to this app" });


                const commandList = TradingAppManager.openApp(name, sessionCredentials[name]); // pass session if present
                if (!commandList[command]) return res.status(404).json({ error: "Command not found" });

                return commandList[command]();

            }
        }


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
                    res.json(returnData);
                } catch (err) {
                    res.status(500).json();
                    console.error(err.stack);
                }
            });
        }
    }
}

export default EndPoints;
