import WebSocket, { WebSocketServer } from "ws";

class AdminPanel {
    static wss = null;

    // Initialize WebSocket server
    static init(port = 8080) {
        if (this.wss) return;

        this.wss = new WebSocketServer({ port });
        console.log(`[AdminPanel] WebSocket server running on ws://localhost:${port}`);

        this.wss.on("connection", (ws) => {
            console.log("[AdminPanel] Client connected");

            ws.on("message", (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    console.log("[AdminPanel] Received JSON:", data);
                    // You can handle commands or forward them elsewhere
                } catch (err) {
                    console.error("[AdminPanel] Invalid JSON:", message.toString());
                }
            });

            ws.on("close", () => {
                console.log("[AdminPanel] Client disconnected");
            });
        });

    }

    static broadCastData = {};

    // Broadcast JSON to all connected clients
    static broadcast(json) {
        if (!this.wss) return;
        const message = JSON.stringify(json);

        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

}

export default AdminPanel;
