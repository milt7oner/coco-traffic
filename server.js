const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// --- Configuración ---
const port = 8080;
// ---------------------

const app = express();

// Servir archivos estáticos
app.use(express.static(__dirname));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = []; // Array para almacenar los clientes conectados

wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('Nuevo cliente conectado. Total:', clients.length);

    ws.on('message', (message) => {
        const messageString = message.toString();
        console.log(`Recibido: ${messageString}`);

        // Retransmitir el mensaje a TODOS los otros clientes conectados (sincronización)
        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
        console.log('Cliente desconectado. Total:', clients.length);
    });
});

server.listen(port, () => {
    console.log(`Servidor HTTP y WebSocket escuchando en http://localhost:${port}`);
});