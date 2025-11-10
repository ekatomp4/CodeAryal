import crypto from "node:crypto";

const expirationInHours = 1;
class Session {
    constructor({ appAccountData, accountData  } = {}) {
        this.UUID = crypto.randomUUID();
        this.expiresAt = Date.now() + expirationInHours * 60 * 60 * 1000;
        this.createdAt = Date.now();

        if(!accountData || !appAccountData) return;
        this.accountData = accountData; // holds account data for this app
        this.appAccountData = appAccountData; // holds credentials for connected apps
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
    
    /**
     * Creates a new session and returns its UUID
     * @param {object} account - The account data for the session
     * @returns {string} The UUID of the created session
     */
    static createSession({ account }) {
        // TODO add fetched account data from database from login credentials
        const fetchedAccountCredentials = {
            "paper": {
                username: "test",
                password: "test"
            }
        }; // placeholder

        const session = new Session({
            appAccountData: fetchedAccountCredentials, // holds credentials for connected apps
            accountData: account // holds account data for this app
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

    /**
     * Returns the account data for a session
     * @param {string} sessionUUID - The UUID of the session
     * @returns {object} The account data for the session   
     */
    static getSession(sessionUUID) { // get roles attached / data
        return SessionManager.sessions[sessionUUID]?.appAccountData || null;
    } 

    /**
     * Updates the expiration time for a session
     * @param {string} sessionUUID - The UUID of the session to update
     */
    static updateSesion() {
        const sessionUUID = Object.keys(SessionManager.sessions)[0];
        SessionManager.sessions[sessionUUID].expiresAt = Date.now() + expirationInHours * 60 * 60 * 1000;
    } // extend expiration by 1 hour

    /**
     * Updates the expiration time for a session
     * @param {string} sessionUUID - The UUID of the session to update
     */
    static renewSession() {
        const sessionUUID = Object.keys(SessionManager.sessions)[0];
        SessionManager.updateSesion(sessionUUID);
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