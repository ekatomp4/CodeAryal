import crypto from "node:crypto";
import SOLANA from "../constants/classes/apps/SOLANA.js";

const accounts = {
    "ekato": {
        name: "ekato",
        password: crypto.createHash('sha256').update('password123').digest('hex'),
        accountCredentials: {
            "paper": {
                username: "ekato_trader",
                password: "securepassword"
            },
            "solana": {
                address: "GnBP8EpuVkLPACtUKs4jVVHko74EuHqS4QBayJvgzudc",
                base58PrivateKey: 'privatekey'
            }
        }
    }
}

const expirationInHours = 1;
class Session {

    constructor({ appAccountData, accountData, clientData = {} } = {}) {
        this.UUID = crypto.randomUUID();
        this.expiresAt = Date.now() + expirationInHours * 60 * 60 * 1000;
        this.createdAt = Date.now();

        if (!accountData || !appAccountData) return;
        this.accountData = accountData; // holds account data for this app
        this.appAccountData = appAccountData; // holds credentials for connected apps

        this.clientData = {
            IP: null,
            ...clientData
        }; // holds data about the client ( IP, user agent, etc )
        /*
        {
            "paper": {
                username: "test",
                password: "test"
            }
        }
        */
    }
}

class SessionManager {
    static sessions = {};
    static checkSessionTimeout = 10000; // 10 seconds


    static verifyLogin(name, password) {

        const user = accounts[name];
        if (!user) return null;

        const hashed = crypto.createHash("sha256").update(password).digest("hex");
        if (user.password !== hashed) return null;

        return user; // valid user object
    }

    static checkAdminSession(sessionUUID) {
        const session = SessionManager.findSession(sessionUUID);
        if(!session) return false;
        return session.accountData.name === "ekato";
    }

    /**
     * Creates a new session and returns its UUID
     * @param {object} account - The account data for the session
     * @returns {string} The UUID of the created session
     */
    static createSession({ name, password, IP }) {
        const user = SessionManager.verifyLogin(name, password);
        if (!user) return null;

        console.log("Creating session for user:", name, "from IP:", IP);
    
        // see if an active session exists for that user
        for (const sessionUUID in SessionManager.sessions) {
            const session = SessionManager.sessions[sessionUUID];
            if (session.accountData.name === user.name) {
                // if the IP matches, reuse and extend session
                if (session.clientData.IP === IP) {
                    SessionManager.updateSession(sessionUUID);
                    return session.UUID;
                } else {
                    // optional: invalidate old session if IP changes
                    delete SessionManager.sessions[sessionUUID];
                }
            }
        }
    
        // create new session
        const session = new Session({
            appAccountData: user.accountCredentials,
            accountData: { name: user.name },
            clientData: { IP }
        });
    
        SessionManager.sessions[session.UUID] = session;
        return session.UUID;
    }

    /**
     * Removes a session from the manager
     * @param {string} sessionUUID - The UUID of the session to remove
     */
    static removeSession(sessionUUID) {
        if (SessionManager.sessions[sessionUUID]) delete SessionManager.sessions[sessionUUID];
    }

    /**
     * Checks if a session exists and is not expired
     * @param {string} sessionUUID - The UUID of the session to check
     * @returns {boolean} True if the session exists and is not expired, false otherwise
     */
    static checkSession(sessionUUID) {
        if (!SessionManager.sessions[sessionUUID]) return false;
        if (Date.now() > SessionManager.sessions[sessionUUID].expiresAt) {
            SessionManager.removeSession(sessionUUID);
            return false;
        }
        return true;
    }

    static findSession(sessionUUID) {
        return SessionManager.sessions[sessionUUID];
    }

    /**
     * Returns the account data for a session
     * @param {string} sessionUUID - The UUID of the session
     * @returns {object} The account data for the session   
     */
    static getSession(sessionUUID) { // get roles attached / data
        return SessionManager.sessions[sessionUUID]?.appAccountData || null;
    }

    /**
     * Returns the account data for a session
     * @param {string} sessionUUID - The UUID of the session
     * @returns {object} The account data for the session   
     */
    static async getAccountData(sessionUUID) {
        const session = SessionManager.sessions[sessionUUID];
        if (!session) return {};
    
        // recursively remove any key containing "private"
        const sanitize = (obj) => {
            if (!obj || typeof obj !== "object") return obj;
    
            const clean = Array.isArray(obj) ? [] : {};
    
            for (const [key, value] of Object.entries(obj)) {
                if (key.toLowerCase().includes("private")) continue; // remove it
                if (key.toLowerCase().includes("password")) continue;
    
                clean[key] = typeof value === "object"
                    ? sanitize(value)
                    : value;
            }
    
            return clean;
        };
    
        // remove password from base account
        const { password, ...baseAccount } = session.accountData || {};

        const solanaHoldings =  session.appAccountData["solana"] ? await SOLANA.getBalance(session.appAccountData["solana"]) : null
        if(solanaHoldings) {

        }
        
        const result = {
            baseAccount,
            holdings: {
                "solana": solanaHoldings
            }
        };
    
        const filteredAppData = sanitize(session.appAccountData || {});
        if (Object.keys(filteredAppData).length > 0) {
            result.accountCredentials = filteredAppData;
        }
    
        return result;
    }
    

    /**
     * Updates the expiration time for a session
     * @param {string} sessionUUID - The UUID of the session to update
     */
    static updateSession(sessionUUID) {
        SessionManager.sessions[sessionUUID].expiresAt = Date.now() + 60 * 60 * 1000;
    } // extend expiration by 1 hour

    /**
     * Updates the expiration time for a session
     * @param {string} sessionUUID - The UUID of the session to update
     */
    static renewSession(sessionUUID) {
        SessionManager.sessions[sessionUUID].expiresAt = Date.now() + expirationInHours * 60 * 60 * 1000;
    } // extend expiration



    static init() {
        setInterval(() => {
            for (const sessionUUID in SessionManager.sessions) {
                if (Date.now() > SessionManager.sessions[sessionUUID].expiresAt) {
                    SessionManager.removeSession(sessionUUID);
                }
            }
        }, SessionManager.checkSessionTimeout);
    } // loop
}

export default SessionManager;