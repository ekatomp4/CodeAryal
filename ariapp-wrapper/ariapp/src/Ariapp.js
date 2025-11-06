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

    static BUILD = (app)=>{
        const fullPath = path.resolve(process.cwd(), app.build.dist);
        console.log("Building to dist folder: " + fullPath);

        // make dist folder
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath);
        

        // go through routes and add to dist with added scripts

        // init new dist routes



        // run express, then build, make all routes go through dist
    }


    // constructor
    constructor({ port, routes = [], include = [], build = {} } = {}) {
        if (typeof port !== "number") throw new Error("Port must be a number");

        this.app = express();
        this.app.use(express.json());

        // build
        this.build = {
            dist: "dist"
        };
        for(let key in build) this.build[key] = build[key];

        // serve static folders automatically
        for (let folder of include) {
            const formattedRoute = folder.startsWith("/") ? folder : `/${folder}`;
            const absolutePath = path.join(process.cwd(), folder); // resolve from project root
            this.app.use(formattedRoute, express.static(absolutePath));
        }

        // build
        Ariapp.BUILD(this);

        // add routes
        for (let route of routes) this.addRoute(route);

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
