import fs from "fs";
import path from "path";

class ArialDB {

    runningDir = process.cwd();
    dbDir = null;

    constructor({ dbDir = "db" } = {}) {

        console.log("ArialDB initialized in " + this.runningDir);

        // init variables
        this.dbDir = path.join(this.runningDir, dbDir);
        this.configPath = path.join(this.dbDir, "config.json");
        this.dataDir = path.join(this.dbDir, "data");

        // setup
        this.setup();

        // runtime variables
        this.config = this.getConfig();

        // return
        return this;
    }

    async getConfig() {
        if(!this.config) this.config = JSON.parse(fs.readFileSync(this.configPath));
        return this.config;
    }

    async setup() {
        // create db folder if it doesn't exist
        if (!fs.existsSync(this.dbDir)) {
            fs.mkdirSync(this.dbDir);
            console.log("Created db folder");
        }

        // create config inside 
        const baseConfig = { 
            "increment": 0
        };

        if (!fs.existsSync(this.configPath)) {
            fs.writeFileSync(this.configPath, JSON.stringify(baseConfig));
            console.log("Created config file");
        }

        // make data directory if it doesn't exist
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir);
            console.log("Created data folder");
        }
    }

    // to be added
    migrate() {}
}

export default ArialDB;