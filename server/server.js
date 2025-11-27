const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// --- Configuración del Puerto ---

// Render (y la mayoría de los servicios de alojamiento) asigna el puerto 
// dinámicamente a través de la variable de entorno PORT.
// Si esta variable no existe (ej. corriendo localmente), usamos 8080 como fallback.
const port = process.env.PORT || 8080;

// --------------------------------

const app = express();

// Servir archivos estáticos (aunque aquí solo necesitamos el servidor WS)
app.use(express.static(__dirname));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = []; 

wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('Nuevo cliente conectado. Total:', clients.length);

    ws.on('message', (message) => {
        const messageString = message.toString();
        console.log(`Recibido: ${messageString}`);

        // Retransmitir el mensaje a TODOS los otros clientes conectados
        clients.forEach(client => {
            // Asegurarse de que el cliente esté abierto y no sea el remitente original
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
    // El puerto reportado será el asignado por Render (ej. 10000), no necesariamente 8080
    console.log(`Servidor HTTP y WebSocket escuchando en el puerto ${port}`);
});