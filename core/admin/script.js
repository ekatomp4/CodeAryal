const ws = new WebSocket("ws://localhost:7944");

ws.addEventListener("open", () => {
    console.log("[Admin] Connected to WebSocket");
});

// TODO make web socket secure as well (encrypt, or add key)

ws.addEventListener("message", (event) => {
    try {
        const data = JSON.parse(event.data);
        console.log("[Admin] Received JSON:", data);

        // Update server info
        const heapPercent = (data.memory.heapUsed / data.memory.heapTotal) * 100;
        document.getElementById("uptime").innerText = `${new Date(data.uptime).toISOString().slice(11, 19)}`;
        document.getElementById("memory").innerHTML = `
            RSS: ${(data.memory.rss/1024/1024).toFixed(2)}MB
            <br>
            Heap: ${(data.memory.heapUsed/1024/1024).toFixed(2)}MB / Limit: ${(data.memory.heapTotal/1024/1024).toFixed(2)}MB
            <br>
            Heap usage: ${heapPercent.toFixed(2)}%
        `.trim();
        document.getElementById("cpu").innerText = `User: ${data.cpu.user}, Sys: ${data.cpu.system}`;
        document.getElementById("load").innerText = data.load.map(l => l.toFixed(2)).join(", ");
        document.getElementById("connections").innerText = data.clients || "-";

        // Update services table
        const tbody = document.querySelector("#services-table tbody");
        tbody.innerHTML = ""; // clear previous
        data.services.forEach(s => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${s.name}</td>
                <td>${s.running}</td>
                <td>${s.formattedUptime || '-'}</td>
                <td>${s.lastStarted ? new Date(s.lastStarted).toLocaleTimeString() : '-'}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("[Admin] Invalid JSON received:", event.data);
    }
});

ws.addEventListener("close", () => {
    console.log("[Admin] Connection closed");
});