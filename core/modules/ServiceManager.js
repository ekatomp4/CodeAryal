import { spawn } from "child_process";

class Service {
    constructor({ name, URL, filePath, type } = {}) {
        this.name = name;
        this.URL = URL;
        this.filePath = filePath;
        this.type = type || "node";
        this.process = null;
        this.running = false;
        this.deactivated = false;

        this.lastStarted = null;
        this.uptime = 0;
        this.formattedUptime = "0d 0h 0m 0s";
        this._startTime = null;
    }

    start() {
        if (this.running) return;

        let command, args = [];
        switch (this.type) {
            case "node": command = "node"; args = [this.filePath]; break;
            case "python": command = "python"; args = [this.filePath]; break;
            case "java": command = "java"; args = ["-jar", this.filePath]; break;
            default: console.warn(`Unknown service type: ${this.type}`); return;
        }

        console.log(`[ServiceManager] Starting ${this.name}...`);
        this.lastStarted = new Date();
        this._startTime = Date.now();

        this.process = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
        this.running = true;

        this.process.stdout.on("data", (data) => console.log(`[${this.name}] ${data.toString().trim()}`));
        this.process.stderr.on("data", (data) => console.error(`[${this.name} ERROR] ${data.toString().trim()}`));

        this.process.on("exit", (code, signal) => {
            console.log(`[${this.name}] exited with code ${code}, signal ${signal}`);
            this.running = false;

            if (this._startTime) {
                this.uptime += Date.now() - this._startTime;
                this.formattedUptime = this.formatUptime(this.uptime);
                this._startTime = null;
            }

            if (!this.deactivated) {
                console.log(`[ServiceManager] Restarting ${this.name}...`);
                setTimeout(() => this.start(), 1000);
            }
        });
    }

    formatUptime(ms) {
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    stop() {
        if (this.process) {
            console.log(`[ServiceManager] Stopping ${this.name}...`);
            this.process.kill();
            this.running = false;

            if (this._startTime) {
                this.uptime += Date.now() - this._startTime;
                this.formattedUptime = this.formatUptime(this.uptime);
                this._startTime = null;
            }
        }
    }

    getUptime() {
        const totalUptime = this.running && this._startTime
            ? this.uptime + (Date.now() - this._startTime)
            : this.uptime;
        this.formattedUptime = this.formatUptime(totalUptime);
        return totalUptime;
    }
}

class ServiceManager {
    static services = [
        new Service({ name: "test", filePath: "test.js", type: "node" })
    ];

    static monitorInterval = 5000;

    static init() {
        for (const service of this.services) service.start();

        setInterval(() => {
            for (const service of this.services) {
                if (service.deactivated) continue;

                if (!service.running || !service.process || service.process.killed) {
                    console.log(`[ServiceManager] ${service.name} is not running, restarting...`);
                    service.start();
                }

                service.getUptime(); // updates formattedUptime continuously
            }
        }, this.monitorInterval);
    }

    static stopAll() {
        for (const service of this.services) service.stop();
    }

    static printStatus() {
        console.log("Service Status:");
        for (const service of this.services) {
            console.log(
                `${service.name}: running=${service.running}, deactivated=${service.deactivated}, lastStarted=${service.lastStarted}, uptime=${service.formattedUptime}`
            );
        }
    }
}

export default ServiceManager;
