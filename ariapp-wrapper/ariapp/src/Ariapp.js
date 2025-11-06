import express from "express";

import Route, { PageRoute, ApiRoute, JsonRoute, DownloadRoute, MiddlewareRoute, ErrorRoute } from "./classess/Route.js";

import path from "path";
import fs from "fs";

export default class Ariapp {

    // classes
    static Route = Route;
    static PageRoute = PageRoute;
    static JsonRoute = JsonRoute;
    static DownloadRoute = DownloadRoute;
    static ApiRoute = ApiRoute;
    static ErrorRoute = ErrorRoute;
    static MiddlewareRoute = MiddlewareRoute;

    // tools
    static DIRNAME = process.cwd();
    DIRNAME = process.cwd();
    
    path = path;
    fs = fs;

    static BUILD = (app) => {
        const __dirname = process.cwd();
    

        // setup page caching middleware
        app.app.use((req, res, next) => {
            res.send = function (body) {
                console.log("Captured response body:", body); // do something with it
                // Call the original send
                return originalSend.call(this, body);
            };
            
            next();
        });
    
        // Iterate through all routes
        for (const route of app.routes) {
            if(route.build) {
                route.build(app);
            }
            route.init(app);
        }
    };
    


    // constructor
    constructor({ port, routes = [], include = [], build = {} } = {}) {
        if (typeof port !== "number") throw new Error("Port must be a number");

        this.app = express();
        this.app.use(express.json());

        // build
        this.build = {
            
        };
        for(let key in build) this.build[key] = build[key];

        // serve static folders automatically
        for (let folder of include) {
            const formattedRoute = folder.startsWith("/") ? folder : `/${folder}`;
            const absolutePath = path.join(process.cwd(), folder); // resolve from project root
            this.app.use(formattedRoute, express.static(absolutePath));
        }

        // build
        this.routes = routes;
        Ariapp.BUILD(this);

        // add routes
        // for (let route of routes) this.addRoute(route);

        // start server
        this.app.listen(port, () => {
            console.log(`Server running on port ${port}, http://localhost:${port}`);
        });


    }

    addRoute(route) {
        if (!(route instanceof Route)) throw new Error("Route must be an instance of Route");
        route.init(this);
    }

}
