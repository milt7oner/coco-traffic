const video = document.getElementById('webcam');
const statusElement = document.getElementById('status');
const toggleBgButton = document.getElementById('toggle-bg');
const toggleHighBeamButton = document.getElementById('toggle-high-beam');
const turnLeftButton = document.getElementById('turn-left');
const turnRightButton = document.getElementById('turn-right');
const bodyDetection = document.getElementById('body-detection');

const desiredClasses = ['person', 'bicycle', 'motorbike', 'bus','car'];

const WS_URL = 'ws://localhost:8080';
const ws = new WebSocket(WS_URL);

let isDay = true; 
let isManualHighBeamActive = false;
let currentDetectionState = 'CLEAN'; 

let model;

// --- Funciones de Utilidad ---

function applyBackgroundChange(command) {
    if (command === 'SET_NIGHT') {
        bodyDetection.classList.add('night');
        toggleBgButton.innerText = 'Modo: NOCHE';
    } else if (command === 'SET_DAY') {
        bodyDetection.classList.remove('night');
        toggleBgButton.innerText = 'Modo: DÍA';
    }
    isDay = (command === 'SET_DAY'); 
}

function updateHighBeamButton(isActive) {
    isManualHighBeamActive = isActive; 
    if (isActive) {
        toggleHighBeamButton.innerText = 'Apagar Luces Altas';
        toggleHighBeamButton.style.backgroundColor = '#d32f2f';
        toggleHighBeamButton.style.boxShadow = '0 0 10px #ff9800';
    } else {
        toggleHighBeamButton.innerText = 'Encender Luces Altas';
        toggleHighBeamButton.style.backgroundColor = '#ff9800'; 
        toggleHighBeamButton.style.boxShadow = 'none';
    }
}

async function setupWebcam() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                'video': { facingMode: 'environment' }
            });
            video.srcObject = stream;
            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.width = video.videoWidth;
                    video.height = video.videoHeight;
                    resolve();
                };
            });
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            statusElement.innerText = 'Error: No se pudo acceder a la cámara.';
        }
    }
}

async function runDetection() {
    // Carga del modelo COCO-SSD
    model = await cocoSsd.load(); 
    statusElement.innerText = 'Modelo cargado. Iniciando cámara...';
    await setupWebcam();
    video.play();
    statusElement.innerText = 'Detección Iniciada.';

    async function detectFrame() {
        const predictions = await model.detect(video);
        
        let targetDetected = false;
        
        for (let i = 0; i < predictions.length; i++) {
            const prediction = predictions[i];
            // Si detecta un objeto de interés con buena confianza
            if (desiredClasses.includes(prediction.class) && prediction.score > 0.6) {
                targetDetected = true;
                break; 
            }
        }
        
        const newDetectionState = targetDetected ? 'ALARM' : 'CLEAN';
        
        // Solo envía el mensaje si el estado de detección cambia
        if (newDetectionState !== currentDetectionState && ws.readyState === WebSocket.OPEN) {
            currentDetectionState = newDetectionState;
            const message = 'DETECTION_' + currentDetectionState;
            ws.send(message);
            statusElement.innerText = targetDetected 
                ? '¡Objeto detectado! Enviando ALARMA.' 
                : 'Área despejada. Enviando CLEAN.';
        }

        requestAnimationFrame(detectFrame); 
    }

    detectFrame();
}

// --- WebSocket Handlers ---
ws.onopen = () => {
    console.log('Conectado al servidor WebSocket.');
    runDetection(); 
    // Enviar estados iniciales al cliente de luces
    ws.send('SET_DAY'); 
    ws.send('MANUAL_HIGH_OFF'); 
    ws.send('TURN_STRAIGHT'); 
};

ws.onmessage = (event) => {
    const message = event.data;
    
    // Sincronización de estados (aunque este cliente es el maestro de control)
    if (message === 'SET_DAY' || message === 'SET_NIGHT') {
        applyBackgroundChange(message);
    } else if (message === 'MANUAL_HIGH_ON') {
        updateHighBeamButton(true);
    } else if (message === 'MANUAL_HIGH_OFF') {
        updateHighBeamButton(false);
    }
    // No necesitamos sincronizar el giro aquí, ya que este cliente lo controla.
};

ws.onerror = (error) => {
    console.error('Error de WebSocket:', error);
    statusElement.innerText = 'Error de conexión con el servidor.';
};

// --- Manejo de Botones ---

// 1. Botón Día/Noche
toggleBgButton.addEventListener('click', () => {
    const command = isDay ? 'SET_NIGHT' : 'SET_DAY';
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(command);
    }
    applyBackgroundChange(command); 
});

// 2. Botón Luces Altas Manuales
toggleHighBeamButton.addEventListener('click', () => {
    const newState = !isManualHighBeamActive;
    const command = newState ? 'MANUAL_HIGH_ON' : 'MANUAL_HIGH_OFF';
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(command);
    }
    updateHighBeamButton(newState); 
});

// 3. Botones de Giro (Usa mousedown/mouseup y touchstart/touchend para simular el pulso)
function sendTurnCommand(command) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(command);
    }
}

// Girar Izquierda: Comando enviado al presionar
turnLeftButton.addEventListener('mousedown', () => sendTurnCommand('TURN_LEFT'));
turnLeftButton.addEventListener('touchstart', () => sendTurnCommand('TURN_LEFT'));
// Volver a Recto: Comando enviado al soltar
turnLeftButton.addEventListener('mouseup', () => sendTurnCommand('TURN_STRAIGHT'));
turnLeftButton.addEventListener('touchend', () => sendTurnCommand('TURN_STRAIGHT'));

// Girar Derecha: Comando enviado al presionar
turnRightButton.addEventListener('mousedown', () => sendTurnCommand('TURN_RIGHT'));
turnRightButton.addEventListener('touchstart', () => sendTurnCommand('TURN_RIGHT'));
// Volver a Recto: Comando enviado al soltar
turnRightButton.addEventListener('mouseup', () => sendTurnCommand('TURN_STRAIGHT'));
turnRightButton.addEventListener('touchend', () => sendTurnCommand('TURN_STRAIGHT'));