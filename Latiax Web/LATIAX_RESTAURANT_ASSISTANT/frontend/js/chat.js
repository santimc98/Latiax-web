// Monitoreo de errores del chat con Sentry
function trackError(error, context = {}) {
    // Añadir el error a Sentry
    Sentry.captureException(error, {
        extra: context
    });
    
    console.error('Error en el chat:', error);
}

// Analítica para rastreo de interacciones
function trackEvent(category, action, label = null, value = null) {
    // Enviar evento a Google Analytics
    if (typeof gtag === 'function') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label,
            'value': value
        });
    }
    
    console.log(`Analytics: ${category} - ${action} - ${label || 'N/A'}`);
}

// Verificar que la configuración global esté disponible
if (!window.LATIAX_CONFIG) {
    console.error('ERROR: La configuración global no está disponible en chat.js. Asegúrate de que config.js se cargue primero.');
    trackError(new Error('Configuración global no disponible en chat.js'));
} else {
    console.log('DEBUG: Configuración global disponible en chat.js:', Object.keys(window.LATIAX_CONFIG));
}

// Acceder a las constantes desde el objeto global
const CHAT_API_URL = window.LATIAX_CONFIG?.CHAT_API_URL || 'http://localhost:3000/chat';
const TEST_CONNECTION_URL = window.LATIAX_CONFIG?.TEST_CONNECTION_URL || 'http://localhost:3000/chat/test-connection';
const TTS_API_URL = window.LATIAX_CONFIG?.TTS_API_URL || 'http://localhost:3000/tts';
const MENU_INFO_URL = window.LATIAX_CONFIG?.MENU_INFO_URL || 'http://localhost:3000/chat/menu-info';
const CLEAR_CONTEXT_URL = window.LATIAX_CONFIG?.CLEAR_CONTEXT_URL || 'http://localhost:3000/chat/clear-context';
const BACKEND_URL = window.LATIAX_CONFIG?.BACKEND_URL || 'http://localhost:3000';

console.log('DEBUG: CHAT_API_URL en chat.js:', CHAT_API_URL);
console.log('DEBUG: BACKEND_URL en chat.js:', BACKEND_URL);

// Variables para gestionar el estado de reservas
let reservaActiva = false;
let conversacionReserva = [];
let datosReserva = {
    fecha: null,
    hora: null,
    numPersonas: null,
    nombreCliente: null,
    emailCliente: null,
    completa: false
};

// Variables para la información del restaurante
let totalMesas = 12; // Valor por defecto según el servidor (MESAS_TOTALES)
let reservas = []; // Array vacío por defecto

// Variable para mantener el ID de sesión
let sessionId = localStorage.getItem('chat_session_id') || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
// Guardar el ID de sesión en localStorage
localStorage.setItem('chat_session_id', sessionId);
console.log(`Usando sessionId: ${sessionId}`);

// Función para enviar mensajes
async function sendMessage() {
    const userMessage = document.getElementById("userInput").value.trim();
    
    // Si no hay mensaje, no hacer nada
    if (!userMessage) return;
    
    // Trackear evento de envío de mensaje
    trackEvent('Chat', 'EnviarMensaje', userMessage.length > 20 ? userMessage.substring(0, 20) + '...' : userMessage);
    
    // Limpiar input
    document.getElementById("userInput").value = "";
    
    // Agregar mensaje del usuario al chat
    addMessageToChat(userMessage, 'user');
    
    // Mostrar indicador de "escribiendo..."
    addTypingIndicator();
    
    // --- ELIMINAR BLOQUE DE RESPUESTAS PREDEFINIDAS --- 
    /*
    // En modo demo, generamos respuestas predefinidas 
    setTimeout(() => { ... }, 1000); 
    */
    // --------------------------------------------------

    // --- AÑADIR LLAMADA AL BACKEND --- 
    try {
        // Obtener historial completo para contexto
        const history = getMessageHistory(12); // Aumentar a los últimos 12 mensajes
        
        console.log(`Enviando mensaje con sessionId: ${sessionId} y ${history.length} mensajes de contexto`);
        console.log('DEBUG: Usando CHAT_API_URL:', CHAT_API_URL);
        
        const response = await fetch(CHAT_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: userMessage,
                sessionId: sessionId, // Enviar el ID de sesión
                messages: history // Enviar el historial completo
            })
        });

        // Remover indicador de "escribiendo..." al recibir respuesta
        removeTypingIndicator();

        if (!response.ok) {
            let errorData = { error: `Error ${response.status}` };
            try { errorData = await response.json(); } catch(e) {}
            trackError(new Error(errorData.error || `HTTP error ${response.status}`), { request: userMessage });
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log("Respuesta JSON recibida del backend:", data);
        
        // Verificar si la respuesta viene del fallback del backend
        if (data.from_fallback) {
            console.warn("Respuesta generada por el modo fallback del backend.");
            trackEvent('Chat', 'RespuestaRecibida', 'FallbackBackend');
        }
        
        // Buscar la respuesta del modelo en varios posibles campos para mayor compatibilidad
        let respuesta = null;
        
        // Intentar diferentes estructuras de respuesta que podría enviar el backend
        if (data && data.response) {
            respuesta = data.response; // Estructura preferida
        } else if (data && data.message) {
            respuesta = data.message; // Estructura alternativa
        } else if (data && data.reply) {
            respuesta = data.reply; // Formato antiguo
        }
        
        if (respuesta) {
            // Si encontramos alguna respuesta, mostrarla
            addMessageToChat(respuesta, 'bot');
            trackEvent('Chat', 'RespuestaRecibida', 'Exitosa');
        } else {
            // Si no se encontró ninguna respuesta válida
            console.error("La respuesta del backend no contiene ningún campo reconocible:", data);
            const errorMessage = data?.error || "No se recibió una respuesta válida del asistente.";
            addMessageToChat(`Error: ${errorMessage}`, 'bot');
            trackError(new Error("Respuesta inválida del backend"), { responseData: data });
            trackEvent('Chat', 'RespuestaRecibida', 'ErrorRespuestaInvalida');
        }
        
        // Reproducir voz si la respuesta la tiene (adaptar si la estructura es diferente)
        // if (data.audio) { 
        //    playVoiceFromBase64(data.audio);
        // }
        
    } catch (error) {
        // Remover indicador de "escribiendo..." si hubo error
        removeTypingIndicator();
        
        console.error("Error de comunicación con el backend:", error);
        trackError(error, { request: userMessage });
        addMessageToChat("Lo siento, hubo un problema al conectar con el asistente. Por favor, inténtalo de nuevo más tarde.", 'bot');
        trackEvent('Chat', 'RespuestaRecibida', 'ErrorComunicacion');
    }
    // --------------------------------------
}

// Añadir mensaje al chat
function addMessageToChat(message, role) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    if (role === 'user') {
        messageDiv.classList.add('user-message');
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
                <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <i class="fas fa-user user-icon"></i>
        `;
    } else {
        messageDiv.classList.add('bot-message');
        messageDiv.innerHTML = `
            <i class="fas fa-robot bot-icon"></i>
            <div class="message-content">
                <p>${message}</p>
                <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Añadir indicador de "escribiendo..."
function addTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot-message', 'typing-indicator');
    typingDiv.innerHTML = `
        <i class="fas fa-robot bot-icon"></i>
        <div class="message-content">
            <p><span class="typing-dots">...</span></p>
            <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Eliminar indicador de "escribiendo..."
function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Obtener historial de mensajes para contexto
function getMessageHistory(count = 5) {
    const messages = [];
    const messageElements = document.querySelectorAll('.message:not(.typing-indicator)');
    const startIndex = Math.max(0, messageElements.length - count);
    
    for (let i = startIndex; i < messageElements.length; i++) {
        const element = messageElements[i];
        const role = element.classList.contains('user-message') ? 'user' : 'assistant';
        const content = element.querySelector('p').textContent;
        messages.push({ role, content });
    }
    
    return messages;
}

// Extraer información de reserva de la conversación
function extraerInformacionReserva(conversacion) {
    let fecha = null;
    let hora = null;
    let numPersonas = null;
    let nombreCliente = null;
    let emailCliente = null;
    let nombreDetectadoEsteMensaje = false; // Flag para evitar sobreescribir
    let emailDetectadoEsteMensaje = false; // Flag para evitar sobreescribir

    console.log("Analizando conversación para extracción:", conversacion);
    
    // Recorrer la conversación para extraer la información MÁS RECIENTE
    // (Iteramos hacia atrás para priorizar respuestas a preguntas recientes)
    for (let i = conversacion.length - 1; i >= 0; i--) {
        const mensaje = conversacion[i];
        if (mensaje.role === "user") {
            const texto = mensaje.content; // Mantener mayúsculas para el nombre
            const textoLower = texto.toLowerCase();
            console.log(`Analizando mensaje [${i}]:`, textoLower);
            nombreDetectadoEsteMensaje = false; 
            emailDetectadoEsteMensaje = false;
            
            // --- EXTRACCIONES (SOLO SI AÚN NO TENEMOS EL DATO) --- 
            // Buscar fecha
            if (!fecha) {
                if (textoLower.includes("hoy")) { fecha = obtenerFechaActual(); console.log("Fecha detectada (hoy):", fecha); }
                 else if (textoLower.includes("mañana") || textoLower.includes("manana")) { fecha = obtenerFechaMañana(); console.log("Fecha detectada (mañana):", fecha); }
                 else if (/\d{1,2}\/\d{1,2}(\/\d{2,4})?/.test(textoLower)) { const fm=textoLower.match(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/); fecha = fm[0]; console.log("Fecha detectada (formato):", fecha); }
            }
            
            // Buscar hora
            if (!hora) {
                if (/\d{1,2}:\d{2}/.test(textoLower)) { hora = textoLower.match(/\d{1,2}:\d{2}/)[0]; console.log("Hora detectada (HH:MM):", hora); }
                 else if (/a las (\d{1,2})/.test(textoLower)) { const hm=textoLower.match(/a las (\d{1,2})/); hora = `${hm[1]}:00`; console.log("Hora detectada (a las X):", hora); }
                 else if (/\d{1,2}( ?h| ?hrs| ?horas)/.test(textoLower)) { const hm=textoLower.match(/(\d{1,2})( ?h| ?hrs| ?horas)/); hora = `${hm[1]}:00`; console.log("Hora detectada (Xh):", hora); }
            }
            
            // Buscar número de personas
            if (!numPersonas) {
                if (/(\d+)( personas| person| gente| comensales)/.test(textoLower)) { numPersonas = textoLower.match(/(\d+)( personas| person| gente| comensales)/)[1]; console.log("Personas detectadas (explícito):", numPersonas); }
                 else if (/para (\d+)/.test(textoLower)) { numPersonas = textoLower.match(/para (\d+)/)[1]; console.log("Personas detectadas (para X):", numPersonas); } 
                 else if (/seremos (\d+)/.test(textoLower)) { numPersonas = textoLower.match(/seremos (\d+)/)[1]; console.log("Personas detectadas (seremos X):", numPersonas); } 
                 else if (/somos (\d+)/.test(textoLower)) { numPersonas = textoLower.match(/somos (\d+)/)[1]; console.log("Personas detectadas (somos X):", numPersonas); } 
                 else if (/^\d+$/.test(textoLower.trim()) && textoLower.trim().length < 3) {
                     if (i > 0 && conversacion[i-1].role === 'assistant' && conversacion[i-1].content.toLowerCase().includes('cuántas personas')) {
                         numPersonas = textoLower.trim();
                         console.log("Personas detectadas (respuesta num):", numPersonas);
                     }
                 }
            }

            // Buscar email (PRIORIZAR SI SE PIDIÓ)
            if (!emailCliente) {
                const emailMatch = texto.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                 // Si el mensaje anterior pidió el correo Y este mensaje parece un email
                 if (i > 0 && conversacion[i-1].role === 'assistant' && 
                     conversacion[i-1].content.toLowerCase().includes("correo electr")) {
                     if(emailMatch) {
                        emailCliente = emailMatch[0];
                        emailDetectadoEsteMensaje = true;
                        console.log("Email detectado (respuesta a petición):", emailCliente);
                     } else if (!/\d/.test(textoLower) && textoLower.split(' ').length < 4) {
                         // Si no parece fecha/hora/personas, y es corto, asumir que es email aunque no valide bien
                         // La validación final la hará el servidor/servicio de email
                         emailCliente = texto.trim();
                         emailDetectadoEsteMensaje = true;
                         console.warn("Posible email (respuesta a petición, formato no validado):", emailCliente);
                     }
                 }
                 // Si no se pidió, pero el mensaje contiene un email
                 else if (emailMatch && !nombreDetectadoEsteMensaje) { // Evitar confusión si el nombre contenía un email
                    emailCliente = emailMatch[0];
                    emailDetectadoEsteMensaje = true;
                    console.log("Email detectado (encontrado en texto):", emailCliente);
                 }
            }

            // Buscar nombre (EVITAR SI YA DETECTAMOS EMAIL EN ESTE MENSAJE)
            if (!nombreCliente && !emailDetectadoEsteMensaje) {
                 // Patrón "a nombre de [nombre]"
                 const nombreMatch = texto.match(/a nombre de\s+(.+)/i);
                 if (nombreMatch && nombreMatch[1]) {
                     nombreCliente = nombreMatch[1].trim();
                     nombreDetectadoEsteMensaje = true;
                     console.log("Nombre detectado (a nombre de):", nombreCliente);
                 } 
                 // Si el mensaje anterior pidió el nombre Y este mensaje no parece otra cosa
                 else if (i > 0 && conversacion[i-1].role === 'assistant' && 
                          conversacion[i-1].content.toLowerCase().includes("nombre de qui")) {
                     // Excluir si parece fecha, hora, personas o email
                     if (!/\d{1,2}[\/:]\d{1,2}|@|\b(personas|gente|comensales|para \d+|seremos \d+|somos \d+)\b|\bhoy\b|\bmañana\b/.test(textoLower)) {
                         nombreCliente = texto.trim(); // Guardar con capitalización original
                         nombreDetectadoEsteMensaje = true;
                         console.log("Nombre detectado (respuesta a petición):", nombreCliente);
                     }
                 }
            }
        }
        // Detener si ya tenemos todo
        if(fecha && hora && numPersonas && nombreCliente && emailCliente) break;
    }

    // --- FIN DEL BUCLE --- 

    // Marcador final si falta nombre
    if (!nombreCliente && fecha && hora && numPersonas && emailCliente) { // Solo si tenemos email!
        nombreCliente = "_FALTA_NOMBRE_";
        console.log("Usando marcador para nombre faltante (email presente)");
    }

    // Determinar estado final
    let completa = !!(fecha && hora && numPersonas && nombreCliente && nombreCliente !== "_FALTA_NOMBRE_" && emailCliente);
    const faltante = [];
    if (!fecha) faltante.push("fecha");
    if (!hora) faltante.push("hora");
    if (!numPersonas) faltante.push("personas");
    if (!nombreCliente || nombreCliente === "_FALTA_NOMBRE_") faltante.push("nombre");
    if (!emailCliente) faltante.push("email");
    
    return {
        fecha,
        hora,
        numPersonas,
        nombreCliente,
        emailCliente,
        completa,
        faltante
    };
}

// Enviar la reserva al servidor
async function enviarReserva(info) {
    console.log("Enviando reserva al servidor:", info);
    
    if (!info.fecha || !info.hora || !info.numPersonas || !info.nombreCliente || !info.emailCliente) {
        appendMessage("LATIAX Asiste", "Lo siento, necesito completar todos los detalles (fecha, hora, personas, nombre y email) antes de enviar la reserva.");
        resetearReserva();
        return;
    }

    const datosParaEnviar = {
        fecha: info.fecha,
        hora: info.hora,
        numPersonas: parseInt(info.numPersonas),
        nombreCliente: info.nombreCliente,
        emailCliente: info.emailCliente
    };
    
    try {
        console.log("URL de la API:", `${BACKEND_URL}/reservas`);
        console.log("Enviando datos de reserva:", { url: `${BACKEND_URL}/reservas`, method: 'POST', data: datosParaEnviar });

        const response = await fetch(`${BACKEND_URL}/reservas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosParaEnviar)
        });

        console.log("Respuesta de la API:", `${response.status} ${response.statusText}`);

        if (!response.ok) {
            let errorBody = null;
            try {
                errorBody = await response.json();
                console.log("Cuerpo de la respuesta de error:", errorBody);
            } catch (e) {
                console.error("No se pudo parsear el cuerpo de la respuesta de error:", e);
            }
            throw new Error(errorBody?.error || `Error ${response.status}`);
        }

        const responseData = await response.json();
        
        appendMessage("LATIAX Asiste", `¡Perfecto, ${info.nombreCliente}! Tu reserva para ${info.numPersonas} personas el ${info.fecha} a las ${info.hora} ha sido confirmada. Recibirás un email con los detalles. ¡Te esperamos!`);
        
        resetearReserva();
        
    } catch (error) {
        console.error("Error al enviar la reserva:", error);
        appendMessage("LATIAX Asiste", `Lo siento, no pude completar tu reserva: ${error.message}. Por favor, inténtalo de nuevo o revisa los datos.`);
        resetearReserva(); 
    }
}

// Resetear el estado de la reserva
function resetearReserva() {
    reservaActiva = false;
    conversacionReserva = [];
    datosReserva = {
        fecha: null,
        hora: null,
        numPersonas: null,
        nombreCliente: null,
        emailCliente: null,
        completa: false
    };
}

function appendMessage(author, text) {
    const chat = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
  
    if (author === "Tú") {
      messageDiv.className = "message user-message";
      messageDiv.innerHTML = `
          <div class="message-content">
              <p>${text}</p>
          </div>
          <i class="fas fa-user user-icon"></i>
      `;
    } else {
      messageDiv.className = "message bot-message";
      // Escapar comillas inversas y saltos de línea en el texto para el onclick
      const escapedText = text.replace(/`/g, '\\\\`').replace(/\\n/g, '\\\\n');
      messageDiv.innerHTML = `
          <i class="fas fa-robot bot-icon"></i>
          <div class="message-content">
              <p>${text}</p>
              
          </div>
      `;
    }
  
    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;
}
  
// Funciones para la interfaz de reservas
async function consultarReservas() {
    const fecha = document.getElementById("fechaConsulta").value;
    const hora = document.getElementById("horaConsulta").value;
  
    if (!fecha || !hora) {
      document.getElementById("resultadoConsulta").textContent = "Por favor, selecciona fecha y hora para consultar.";
      return;
    }
  
    try {
      const res = await fetch(`${BACKEND_URL}/api/reservas?fecha=${fecha}&hora=${hora}`);
      const data = await res.json();
  
      if (res.ok) {
        if (data.reservas && data.reservas.length > 0) {
          document.getElementById("resultadoConsulta").textContent =
            JSON.stringify(data.reservas, null, 2);
        } else {
          document.getElementById("resultadoConsulta").textContent =
            "No hay reservas para la fecha y hora seleccionadas.";
        }
      } else {
        document.getElementById("resultadoConsulta").textContent =
          `Error al consultar reservas: ${data.error}`;
      }
    } catch (error) {
      console.error("Error al consultar reservas:", error);
      document.getElementById("resultadoConsulta").textContent =
        "Error al consultar reservas. Por favor, intenta de nuevo más tarde.";
    }
}
  
async function guardarReserva() {
    const nombre = document.getElementById("nombre").value;
    const fecha = document.getElementById("fecha").value;
    const hora = document.getElementById("hora").value;
    const mesas = parseInt(document.getElementById("mesas").value);
  
    if (!nombre || !fecha || !hora || !mesas) {
      document.getElementById("estadoReserva").textContent =
        "Por favor, completa todos los campos para realizar la reserva.";
      return;
    }
  
    try {
      const res = await fetch(`${BACKEND_URL}/api/reservas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, fecha, hora, mesas })
      });
  
      const data = await res.json();
  
      if (res.ok) {
        document.getElementById("estadoReserva").textContent =
          `¡Reserva confirmada para el ${fecha} a las ${hora} para ${mesas} personas a nombre de ${nombre}!`;
  
        document.getElementById("nombre").value = "";
        document.getElementById("fecha").value = "";
        document.getElementById("hora").value = "";
        document.getElementById("mesas").value = "";
      } else {
        document.getElementById("estadoReserva").textContent =
          `Error al procesar la reserva: ${data.error}`;
      }
    } catch (error) {
      console.error("Error al guardar la reserva:", error);
      document.getElementById("estadoReserva").textContent =
        "Error al procesar la reserva. Por favor, intenta de nuevo más tarde.";
    }
}
  
// Obtener fecha actual en formato DD/MM/YYYY
function obtenerFechaActual() {
    const hoy = new Date();
    return `${hoy.getDate().toString().padStart(2, '0')}/${(hoy.getMonth() + 1).toString().padStart(2, '0')}/${hoy.getFullYear()}`;
}

// Obtener fecha de mañana en formato DD/MM/YYYY
function obtenerFechaMañana() {
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    return `${mañana.getDate().toString().padStart(2, '0')}/${(mañana.getMonth() + 1).toString().padStart(2, '0')}/${mañana.getFullYear()}`;
} 

// Event listener para enviar con Enter en el input
document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    if (userInput) {
        userInput.addEventListener('keypress', function(event) {
            // Verificar si la tecla presionada es Enter (código 13)
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault(); // Prevenir el comportamiento por defecto (salto de línea)
                sendMessage(); // Llamar a la función de enviar mensaje
            }
        });
    } else {
        console.warn("Elemento #userInput no encontrado al cargar el DOM.");
    }
});

// --- Función para reproducir voz vía backend TTS ---
async function playVoice(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn("Texto vacío, no se reproduce voz.");
        return null; // Retornar null si no hay texto
    }
    console.log("Solicitando audio para:", text.substring(0, 50) + "...");
    try {
        const response = await fetch(TTS_API_URL, { // Usar TTS_API_URL en lugar de `${API_BASE_URL}/tts`
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignorar si no es JSON */ }
            throw new Error(errorMsg);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Retornar una promesa que se resuelve cuando el audio termina
        // o se rechaza si hay un error. También retorna el objeto audio.
        return new Promise((resolve, reject) => {
            audio.onended = () => resolve(audio); // Resuelve con el objeto audio al terminar
            audio.onerror = (e) => reject(e);   // Rechaza si hay error de reproducción
            audio.play().catch(e => reject(e)); // Inicia reproducción, captura error inicial
        });

    } catch (error) {
        console.error("Error al obtener o reproducir voz desde el backend:", error);
        // No relanzar el error aquí para que el flujo continúe, pero retornar null
        return null; 
    }
} 

// --- Inicialización ---
window.addEventListener('DOMContentLoaded', (event) => {
    // Verificar si el botón existe en el HTML
    const resetButton = document.getElementById('resetChatButton');
    if (resetButton) {
        resetButton.addEventListener('click', resetSession);
    }
    
    // Agregar mensaje inicial si el chat está vacío
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages && chatMessages.children.length === 0) {
        addMessageToChat("¡Hola! Soy el asistente del Restaurante El Faro. ¿En qué puedo ayudarte hoy?", 'bot');
    }
});

// Función para resetear la sesión (se puede agregar un botón en la interfaz)
function resetSession() {
    // Generar un nuevo ID de sesión
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('chat_session_id', sessionId);
    
    // Limpiar el historial visual
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    // Notificar al usuario
    addMessageToChat("Conversación reiniciada. ¿En qué puedo ayudarte?", 'bot');
    
    // Resetear estado de reserva
    resetearReserva();
    
    // Opcionalmente, notificar al servidor
    fetch(CLEAR_CONTEXT_URL, { // Usar CLEAR_CONTEXT_URL en lugar de `${API_BASE_URL}/chat/clear-context`
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId })
    }).catch(err => console.warn("No se pudo notificar al servidor sobre el reinicio:", err));
    
    console.log("Sesión reiniciada con ID:", sessionId);
} 

// Cargar información del menú para el chat
async function cargarInformacionMenu() {
    try {
        console.log("Cargando información del menú para el chat...");
        
        // Solicitar información del menú al backend
        const response = await fetch(MENU_INFO_URL); // Usar MENU_INFO_URL en lugar de `${API_BASE_URL}/chat/menu-info`
        
        if (!response.ok) {
            throw new Error(`Error al cargar información del menú: ${response.status}`);
        }

        const data = await response.json();
        console.log("Información del menú recibida del backend:", data);
        
        // Procesar la información del menú
        // ... (código para procesar la información del menú)
        
    } catch (error) {
        console.error("Error al cargar información del menú:", error);
        // ... (código para manejar el error)
    }
}

// Verificar disponibilidad de horas para una fecha
async function verificarDisponibilidadHoras(fecha, numPersonas) {
    try {
        // Validar parámetros
        if (!fecha || !numPersonas) {
            console.error("Faltan parámetros para verificar disponibilidad");
            return null;
        }
        
        console.log(`Verificando disponibilidad para ${fecha} (${numPersonas} personas)...`);
        
        // Solicitar horas disponibles al endpoint
        const response = await fetch(AVAILABLE_HOURS_URL(fecha, numPersonas)); // Usar AVAILABLE_HOURS_URL en lugar de `${API_BASE_URL}/reservas/horas-disponibles/${fecha}/${numPersonas}`
        
        if (!response.ok) {
            throw new Error(`Error al verificar disponibilidad: ${response.status}`);
        }

        const data = await response.json();
        console.log("Respuesta de disponibilidad recibida del backend:", data);
        
        // Procesar la respuesta
        // ... (código para procesar la respuesta)
        
        return data; // Retornar la respuesta procesada
    } catch (error) {
        console.error("Error al verificar disponibilidad:", error);
        return null;
    }
}

// Comprobar conexión con el backend
async function comprobarConexionBackend() {
    try {
        console.log("Comprobando conexión con el backend...");
        
        const response = await fetch(TEST_CONNECTION_URL); // Usar TEST_CONNECTION_URL en lugar de `${API_BASE_URL}/chat/test-connection`
        
        if (!response.ok) {
            throw new Error(`Error en la conexión: ${response.status}`);
        }

        const data = await response.json();
        console.log("Respuesta de conexión recibida del backend:", data);
        
        // Procesar la respuesta
        // ... (código para procesar la respuesta)
        
        return true; // Retornar true si la conexión es exitosa
    } catch (error) {
        console.error("Error al comprobar conexión:", error);
        return false;
    }
} 