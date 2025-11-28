const leftLight = document.getElementById('left-light');
const rightLight = document.getElementById('right-light');
const bodyLights = document.getElementById('body-lights');
const statusElement = document.getElementById('current-status');
const turnStatusElement = document.getElementById('turn-status');

const WS_URL = 'https://coco-traffic.onrender.com';
const ws = new WebSocket(WS_URL);

// --- Variables de Estado Global ---
let isNight = false;
let isManualHighBeamActive = false;
let isAlarmActive = false; 
let currentTurnState = 'TURN_STRAIGHT';

// Array de clases de giro para limpieza rápida
const turnClasses = ['turn-left-main', 'turn-left-assist', 'turn-right-main', 'turn-right-assist'];

// --- Funciones de Control Físico de Luces ---

function setOff() {
    // Apaga las luces (solo mantiene el efecto de giro)
    leftLight.className = 'headlight off';
    rightLight.className = 'headlight off';
    applyTurnVisuals(currentTurnState);
    statusElement.innerText = 'Estado: Apagadas (Modo Día o Noche sin activación)';
}

function setLowBeam() {
    // Luces Bajas (solo mantiene el efecto de giro)
    leftLight.className = 'headlight low-beam-on';
    rightLight.className = 'headlight low-beam-on';
    applyTurnVisuals(currentTurnState);
    statusElement.innerText = 'Estado: Luces Bajas (Conducción Nocturna/Dim)';
}

function setHighBeam() {
    // Luces Altas (solo mantiene el efecto de giro)
    leftLight.className = 'headlight high-beam-on';
    rightLight.className = 'headlight high-beam-on';
    applyTurnVisuals(currentTurnState);
    statusElement.innerText = 'Estado: LUCES ALTAS MANUALES (Advertencia)';
}

// --- Función para Aplicar el Efecto de Giro (AFS) ---
function applyTurnVisuals(state) {
    // 1. Limpiar todas las clases de giro en ambos faros
    leftLight.classList.remove(...turnClasses);
    rightLight.classList.remove(...turnClasses);

    // 2. Aplicar clases de transformación CSS
    if (state === 'TURN_LEFT') {
        // Izquierda (Main)
        leftLight.classList.add('turn-left-main');
        // Derecha (Assist)
        rightLight.classList.add('turn-left-assist');
        turnStatusElement.innerText = 'Giro: IZQUIERDA (AFS activo)';
    } else if (state === 'TURN_RIGHT') {
        // Derecha (Main)
        rightLight.classList.add('turn-right-main');
        // Izquierda (Assist)
        leftLight.classList.add('turn-right-assist');
        turnStatusElement.innerText = 'Giro: DERECHA (AFS activo)';
    } else {
        turnStatusElement.innerText = 'Giro: Recto';
    }
}

// --- Función Principal de Lógica (El Cerebro) ---
function renderLights() {
    // Lógica de iluminación (OFF, BAJAS, ALTAS)
    if (!isNight) {
        setOff();
    } else {
        if (isAlarmActive) {
            setLowBeam(); 
        } else if (isManualHighBeamActive) {
            setHighBeam();
        } else {
            setLowBeam();
        }
    }
    // El efecto de giro se aplica implícitamente dentro de setOff/setLowBeam/setHighBeam
}

// --- Lógica del Fondo Día/Noche ---
function applyBackgroundChange(command) {
    if (command === 'SET_NIGHT') {
        bodyLights.style.backgroundColor = '#1a1a2e'; 
        bodyLights.style.color = '#fff';
        isNight = true;
    } else if (command === 'SET_DAY') {
        bodyLights.style.backgroundColor = '#f0f0f0'; 
        bodyLights.style.color = '#000';
        isNight = false;
    }
    renderLights(); // Recalcular las luces inmediatamente
}

// --- WebSocket Handlers ---
ws.onopen = () => {
    console.log('Conectado al servidor WebSocket.');
    statusElement.innerText = 'Estado: Conectado. Esperando comandos...';
};

ws.onmessage = (event) => {
    const message = event.data;
    
    // 1. DÍA/NOCHE
    if (message === 'SET_DAY' || message === 'SET_NIGHT') {
        applyBackgroundChange(message);
    } 
    
    // 2. ALARMA (Detección de objetos)
    else if (message === 'DETECTION_ALARM') {
        isAlarmActive = true;
        renderLights();
    } else if (message === 'DETECTION_CLEAN') {
        isAlarmActive = false;
        renderLights();
    }
    
    // 3. Luces Altas MANUALES
    else if (message === 'MANUAL_HIGH_ON') {
        isManualHighBeamActive = true;
        renderLights();
    } else if (message === 'MANUAL_HIGH_OFF') {
        isManualHighBeamActive = false;
        renderLights();
    }
    
    // 4. GIRO (AFS)
    else if (message === 'TURN_LEFT' || message === 'TURN_RIGHT' || message === 'TURN_STRAIGHT') {
        currentTurnState = message;
        renderLights(); 
    }
};

ws.onclose = () => {
    console.log('Conexión WebSocket cerrada.');
    statusElement.innerText = 'Estado: Desconectado.';
};

ws.onerror = (error) => {
    console.error('Error de WebSocket:', error);
    statusElement.innerText = 'Estado: Error de conexión.';
};

// Se inicializa el estado visual al cargar
renderLights();