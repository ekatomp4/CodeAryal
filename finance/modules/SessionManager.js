import crypto from "node:crypto";

const expirationInHours = 1;
class Session {
    constructor() {
        this.UUID = crypto.randomUUID();
        this.expiresAt = Date.now() + expirationInHours * 60 * 60 * 1000;
        this.createdAt = Date.now();
    }
}

class SessionManager {
    static sessions = {};
    static checkSessionTimeout = 10000; // 10 seconds
    
    static createSession() {
        const session = new Session();
        SessionManager.sessions[session.UUID] = session;
        return session.UUID;
    }

    static removeSession(sessionUUID) {
        if (SessionManager.sessions[sessionUUID]) delete SessionManager.sessions[sessionUUID];
    }

    static checkSession(sessionUUID) {
        if (!SessionManager.sessions[sessionUUID]) return false;
        if (Date.now() > SessionManager.sessions[sessionUUID].expiresAt) {
            SessionManager.removeSession(sessionUUID);
            return false;
        }
        return true;
    }

    static updateSesion() {} // extend expiration by 1 hour
    static renewSession() {} // extend expiration
    static getSession() {} // get roles attached / data

    static init() {} // loop
}

export default SessionManager;