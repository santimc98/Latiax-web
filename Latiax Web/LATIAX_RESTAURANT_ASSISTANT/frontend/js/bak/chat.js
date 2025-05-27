// Variables para gestionar el estado de reservas
let reservaActiva = false;
let conversacionReserva = [];
let datosReserva = {
    fecha: null,
    hora: null,
    personas: null,
    nombre: null,
    completo: false
};

// Variables para la información del restaurante
let totalMesas = 12; // Valor por defecto según el servidor (MESAS_TOTALES)
let reservas = []; // Array vacío por defecto

async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.trim();
    if (message === "") return;

    appendMessage("Tú", message);
    input.value = "";

    // Imprimir estado actual para depuración
    console.log("Estado de reserva:", { 
        reservaActiva, 
        conversacionLength: conversacionReserva.length,
        ultimoMensaje: conversacionReserva.length > 0 ? 
            conversacionReserva[conversacionReserva.length-1].content.substring(0, 30) + "..." : 
            "ninguno"
    });

    // Detectar intención de reserva
    if (!reservaActiva && (message.toLowerCase().includes("reservar") || message.toLowerCase().includes("reserva"))) {
        console.log("Iniciando proceso de reserva");
        reservaActiva = true;
        conversacionReserva = [];
        
        // Añadir mensaje inicial
        conversacionReserva.push({ role: "user", content: message });
    }
    
    // Si estamos en modo reserva o acabamos de activarlo
    if (reservaActiva) {
        // Si no es el mensaje inicial, añadirlo a la conversación
        if (conversacionReserva.length > 0 && 
            conversacionReserva[conversacionReserva.length-1].content !== message) {
            conversacionReserva.push({ role: "user", content: message });
        }
        
        try {
            // Verificar si tenemos suficiente información para completar la reserva
            const infoExtraida = extraerInformacionReserva(conversacionReserva);
            console.log("Información extraída:", infoExtraida);
            
            // Si solo falta el nombre y este mensaje podría contenerlo
            if (infoExtraida.faltante.length === 1 && 
                infoExtraida.faltante[0] === "nombre" && 
                message.length > 0) {
                
                // Asumimos que este mensaje es el nombre
                const infoActualizada = {
                    ...infoExtraida, 
                    nombre: message.trim(),
                    completa: true
                };
                console.log("Completando reserva con nombre:", message.trim());
                
                // Completar la reserva
                await enviarReserva(infoActualizada);
                return;
            }
            
            // Si tenemos toda la información, enviar la reserva
            if (infoExtraida.completa) {
                await enviarReserva(infoExtraida);
                return;
            }
            
            // Mensaje contextual según lo que falte
            let contextMessage = "";
            if (infoExtraida.faltante.includes("fecha") && !infoExtraida.fecha) {
                contextMessage = "Por favor, indícame para qué día quieres hacer la reserva.";
            } else if (infoExtraida.faltante.includes("hora") && !infoExtraida.hora) {
                contextMessage = `Perfecto, para el ${infoExtraida.fecha}. ¿A qué hora te gustaría reservar?`;
            } else if (infoExtraida.faltante.includes("personas") && !infoExtraida.personas) {
                contextMessage = `Para el ${infoExtraida.fecha} a las ${infoExtraida.hora}. ¿Para cuántas personas será la reserva?`;
            } else if (infoExtraida.nombre === "_FALTA_NOMBRE_" || !infoExtraida.nombre) {
                contextMessage = `Excelente. Reservaré para el ${infoExtraida.fecha} a las ${infoExtraida.hora} para ${infoExtraida.personas} personas. ¿A nombre de quién hago la reserva?`;
                // Siguiente respuesta será el nombre
                conversacionReserva.push({ role: "assistant", content: contextMessage });
                appendMessage("LATIAX Asiste", contextMessage);
                return;
            }
            
            // Si tenemos un mensaje contextual, lo usamos
            if (contextMessage) {
                conversacionReserva.push({ role: "assistant", content: contextMessage });
                appendMessage("LATIAX Asiste", contextMessage);
                return;
            }
            
            // Si no hay mensajes contextuales, usamos la API
            const response = await fetch("http://localhost:3000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: message,
                    contexto: `
Eres un asistente virtual para reservas del Restaurante El Faro de Granada.
Toda la conversación hasta ahora: 
${conversacionReserva.map(m => `${m.role === 'user' ? 'Cliente' : 'Asistente'}: ${m.content}`).join("\n")}

Tu tarea es ayudar a completar una reserva:
1. IMPORTANTE: Ya has analizado la conversación y aún necesitas preguntar por: ${infoExtraida.faltante.join(", ")}.
2. NO preguntes por información que ya te han proporcionado. Según el análisis:
   ${infoExtraida.fecha ? `- Ya sabes la fecha: ${infoExtraida.fecha}` : '- Aún no sabes la fecha'}
   ${infoExtraida.hora ? `- Ya sabes la hora: ${infoExtraida.hora}` : '- Aún no sabes la hora'}
   ${infoExtraida.personas ? `- Ya sabes el número de personas: ${infoExtraida.personas}` : '- Aún no sabes el número de personas'}
   ${infoExtraida.nombre && infoExtraida.nombre !== "_FALTA_NOMBRE_" ? `- Ya sabes el nombre: ${infoExtraida.nombre}` : '- Aún no sabes el nombre'}
3. Pregunta SOLAMENTE por el primer dato faltante de esta lista.
4. Sé muy breve, amable y natural.
5. El restaurante tiene horario de 13:00 a 16:00 y de 20:00 a 23:00.`
                })
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            
            // Añadir respuesta a la conversación
            conversacionReserva.push({ role: "assistant", content: data.reply });
            
            // Mostrar respuesta
            appendMessage("LATIAX Asiste", data.reply);
            
        } catch (error) {
            console.error("Error en la comunicación:", error);
            appendMessage("LATIAX Asiste", "Lo siento, hubo un problema al procesar tu solicitud. ¿Podrías intentarlo de nuevo?");
            // No reseteamos la reserva para darle otra oportunidad
        }
        
        return;
    }

    // Conversación normal (no es una reserva)
    try {
        const response = await fetch("http://localhost:3000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: message,
                contexto: `
Eres un asistente virtual para el Restaurante El Faro, ubicado en Granada.
Hablas en español con un tono profesional y servicial.
Tu horario es de lunes a domingo de 13:00 a 16:00 y de 20:00 a 23:00.
La carta incluye platos vegetarianos, veganos y sin gluten.
Actualmente hay ${totalMesas} mesas disponibles.
Si el cliente quiere hacer una reserva, responde de manera positiva y pregúntale los detalles necesarios.`
            })
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        appendMessage("LATIAX Asiste", data.reply);
        
    } catch (error) {
        console.error("Error de comunicación:", error);
        appendMessage("LATIAX Asiste", "Lo siento, no se pudo contactar con el servidor.");
    }
}

// Extraer información de reserva de la conversación
function extraerInformacionReserva(conversacion) {
    let fecha = null;
    let hora = null;
    let personas = null;
    let nombre = null;

    console.log("Analizando conversación para extracción:", conversacion);
    
    // Recorrer todos los mensajes buscando la información
    for (const mensaje of conversacion) {
        if (mensaje.role === "user") {
            const textoLower = mensaje.content.toLowerCase();
            console.log("Analizando mensaje:", textoLower);
            
            // Buscar fecha
            if (!fecha) {
                if (textoLower.includes("hoy")) {
                    fecha = obtenerFechaActual();
                    console.log("Fecha detectada (hoy):", fecha);
                } else if (textoLower.includes("mañana") || textoLower.includes("manana")) {
                    fecha = obtenerFechaMañana();
                    console.log("Fecha detectada (mañana):", fecha);
                } else if (/\d{1,2}\/\d{1,2}(\/\d{2,4})?/.test(textoLower)) {
                    const fechaMatch = textoLower.match(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/)[0];
                    fecha = fechaMatch;
                    console.log("Fecha detectada (formato):", fecha);
                }
            }
            
            // Buscar hora (mejorado)
            if (!hora) {
                if (/\d{1,2}:\d{2}/.test(textoLower)) {
                    hora = textoLower.match(/\d{1,2}:\d{2}/)[0];
                    console.log("Hora detectada (formato HH:MM):", hora);
                } else if (/a las (\d{1,2})/.test(textoLower)) {
                    const horaMatch = textoLower.match(/a las (\d{1,2})/)[1];
                    hora = `${horaMatch}:00`;
                    console.log("Hora detectada (a las X):", hora);
                } else if (/\d{1,2}( ?h| ?hrs| ?horas)/.test(textoLower)) {
                    const horaMatch = textoLower.match(/(\d{1,2})( ?h| ?hrs| ?horas)/)[1];
                    hora = `${horaMatch}:00`;
                    console.log("Hora detectada (formato Xh):", hora);
                }
            }
            
            // Buscar número de personas (mejorado)
            if (!personas) {
                // Patrones explícitos
                if (/(\d+)( personas| person| gente| comensales)/.test(textoLower)) {
                    personas = textoLower.match(/(\d+)( personas| person| gente| comensales)/)[1];
                    console.log("Personas detectadas (patrón explícito):", personas);
                } 
                // "para X" donde X es un número
                else if (/para (\d+)/.test(textoLower)) {
                    personas = textoLower.match(/para (\d+)/)[1];
                    console.log("Personas detectadas (para X):", personas);
                }
                // "seremos X" donde X es un número
                else if (/seremos (\d+)/.test(textoLower)) {
                    personas = textoLower.match(/seremos (\d+)/)[1];
                    console.log("Personas detectadas (seremos X):", personas);
                }
                // "somos X" donde X es un número
                else if (/somos (\d+)/.test(textoLower)) {
                    personas = textoLower.match(/somos (\d+)/)[1];
                    console.log("Personas detectadas (somos X):", personas);
                }
                // Cualquier número aislado que podría ser personas
                else if (/\b(\d+)\b/.test(textoLower) && !/\d+:\d+/.test(textoLower)) {
                    const numeros = textoLower.match(/\b(\d+)\b/g);
                    // Si hay solo un número en el mensaje y no es parte de una hora o fecha
                    if (numeros && numeros.length === 1 && !textoLower.includes("/") && !textoLower.includes(":")) {
                        personas = numeros[0];
                        console.log("Personas detectadas (número aislado):", personas);
                    }
                }
            }
            
            // Buscar nombre (mejorado)
            if (!nombre) {
                if (/( a nombre de | me llamo | soy | nombre es )([A-Za-zÀ-ÿ\s]+)/.test(textoLower)) {
                    nombre = textoLower.match(/( a nombre de | me llamo | soy | nombre es )([A-Za-zÀ-ÿ\s]+)/)[2].trim();
                    console.log("Nombre detectado:", nombre);
                }
                // Si este es un mensaje corto (2-3 palabras) después de pedir el nombre, asumimos que es el nombre
                else if (mensaje === conversacion[conversacion.length - 1] && 
                        textoLower.split(" ").length <= 4 && 
                        textoLower.split(" ").length >= 1 &&
                        conversacion.length >= 2) {
                    
                    // Verificar si el mensaje anterior del bot pedía el nombre
                    const mensajeAnterior = conversacion[conversacion.length - 2];
                    if (mensajeAnterior.role === "assistant" && 
                        (mensajeAnterior.content.toLowerCase().includes("nombre") || 
                         mensajeAnterior.content.toLowerCase().includes("a nombre de"))) {
                        // Nos aseguramos que el texto no sea "seremos X personas"
                        if (!textoLower.includes("seremos") && !textoLower.includes("personas")) {
                            nombre = mensaje.content.trim();
                            console.log("Nombre detectado (respuesta directa):", nombre);
                        }
                    }
                }
            }
        }
    }

    // PRUEBA ESPECÍFICA: Si detectamos "seremos 4" o similares en algún mensaje
    for (const mensaje of conversacion) {
        if (mensaje.role === "user") {
            const textoLower = mensaje.content.toLowerCase();
            
            // Prueba específica para el patrón problemático
            if (textoLower.includes("seremos") && /\d+/.test(textoLower)) {
                console.log("PATRÓN PROBLEMÁTICO DETECTADO:", textoLower);
                const match = textoLower.match(/seremos\s+(\d+)/i);
                if (match && match[1]) {
                    personas = match[1];
                    console.log("Personas extraídas del patrón problemático:", personas);
                    
                    // Nos aseguramos que esto NO se considere como nombre
                    if (nombre && nombre.toLowerCase().includes("seremos")) {
                        nombre = null;
                        console.log("Resetear nombre porque contenía 'seremos'");
                    }
                }
            }
        }
    }
    
    // Si tenemos todos los datos excepto el nombre, establecer un valor predeterminado temporal
    if (fecha && hora && personas && !nombre) {
        // Si falta solo el nombre y tenemos todo lo demás, usamos un marcador
        // que luego se solicitará específicamente
        nombre = "_FALTA_NOMBRE_";
        console.log("Usando marcador para nombre faltante");
    }
    
    // Verificar si tenemos toda la información básica
    const completa = fecha && hora && personas && nombre && nombre !== "_FALTA_NOMBRE_";
    
    // Información faltante para feedback
    const faltante = [];
    if (!fecha) faltante.push("fecha");
    if (!hora) faltante.push("hora");
    if (!personas) faltante.push("personas");
    if (!nombre || nombre === "_FALTA_NOMBRE_") faltante.push("nombre");
    
    const resultado = {
        fecha,
        hora,
        personas,
        nombre,
        completa,
        faltante
    };
    
    console.log("Resultado de extracción:", resultado);
    return resultado;
}

// Enviar la reserva al servidor
async function enviarReserva(info) {
    console.log("Enviando reserva al servidor:", info);
    
    // Si falta el nombre, preguntarlo antes
    if (info.nombre === "_FALTA_NOMBRE_" || !info.nombre) {
        appendMessage("LATIAX Asiste", `¿A nombre de quién registro la reserva para el ${info.fecha} a las ${info.hora}?`);
        return; // No seguimos con la reserva hasta tener el nombre
    }

    // Validación más estricta para el nombre
    const nombreLower = info.nombre.toLowerCase();
    if (nombreLower.includes("seremos") || 
        nombreLower.includes("somos") || 
        nombreLower.includes("personas") || 
        nombreLower.includes("para") ||
        nombreLower.length < 2) {
        appendMessage("LATIAX Asiste", `Necesito tu nombre para completar la reserva. Por favor, dime tu nombre sin incluir frases como "para X personas".`);
        return;
    }
    
    try {
        // Convertir personas a mesas (asumiendo 4 personas por mesa)
        const mesas = Math.ceil(parseInt(info.personas) / 4);
        
        // URL MODIFICADA para usar el puerto 3000 (servidor principal con Firebase)
        const apiUrl = "http://localhost:3000/api/reservas";
        console.log("URL de la API (PUERTO 3000):", apiUrl);
        
        console.log("Enviando datos de reserva:", {
            url: apiUrl,
            method: "POST",
            data: {
                nombre: info.nombre,
                fecha: info.fecha,
                hora: info.hora,
                mesas: mesas
            }
        });
        
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: info.nombre,
                fecha: info.fecha,
                hora: info.hora,
                mesas: mesas
            })
        });

        console.log("Respuesta de la API:", res.status, res.statusText);

        // Verificar el status HTTP
        if (!res.ok) {
            console.error("Error en la respuesta:", res.status, res.statusText);
            let errorMessage;
            
            try {
                // Intentar leer el cuerpo como texto primero
                const errorText = await res.text();
                console.error("Cuerpo de la respuesta de error:", errorText);
                
                // Intentar parsear como JSON solo si parece JSON válido
                if (errorText.trim().startsWith('{')) {
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage = errorJson.error || `Error ${res.status}`;
                    } catch (jsonError) {
                        errorMessage = errorText || `Error ${res.status}`;
                    }
                } else {
                    errorMessage = errorText || `Error ${res.status}`;
                }
            } catch (parseError) {
                // Si falla la lectura del texto, usar un mensaje genérico
                console.error("Error al leer respuesta:", parseError);
                errorMessage = `Error ${res.status} al procesar la reserva`;
            }
            
            appendMessage("LATIAX Asiste", `Lo siento, no pude completar tu reserva: ${errorMessage}`);
            return;
        }
        
        // Procesar respuesta exitosa
        let responseData;
        try {
            responseData = await res.json();
            console.log("Respuesta exitosa:", responseData);
        } catch (error) {
            console.log("La respuesta no es JSON, pero es exitosa");
        }
        
        appendMessage("LATIAX Asiste", 
            `¡Perfecto! He registrado tu reserva para el ${info.fecha} a las ${info.hora} para ${info.personas} personas a nombre de ${info.nombre}. ¡Te esperamos!`);
        
        // Reiniciar estado
        console.log("Reserva completada con éxito, reiniciando estado");
        resetearReserva();
    } catch (error) {
        console.error("Error al finalizar reserva:", error);
        appendMessage("LATIAX Asiste", "Lo siento, hubo un problema al registrar tu reserva en nuestro sistema. Error: " + error.message);
        // No reseteamos la reserva para permitir un nuevo intento
    }
}

// Resetear el estado de la reserva
function resetearReserva() {
    reservaActiva = false;
    conversacionReserva = [];
    datosReserva = {
        fecha: null,
        hora: null,
        personas: null,
        nombre: null,
        completo: false
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
      const res = await fetch(`http://localhost:3000/api/reservas?fecha=${fecha}&hora=${hora}`);
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
    const fecha = document.getElementById("fechaReserva").value;
    const hora = document.getElementById("horaReserva").value;
    const mesas = document.getElementById("mesasReserva").value;
    const nombre = document.getElementById("nombreReserva").value;
  
    if (!fecha || !hora || !mesas || !nombre) {
      document.getElementById("resultadoReserva").textContent = "Por favor, completa todos los campos.";
      return;
    }
  
    try {
      const res = await fetch("http://localhost:3000/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          hora,
          mesas,
          nombre
        })
      });
  
      const data = await res.json();
  
      if (res.ok) {
        document.getElementById("resultadoReserva").textContent = "Reserva registrada con éxito.";
        document.getElementById("fechaReserva").value = "";
        document.getElementById("horaReserva").value = "";
        document.getElementById("mesasReserva").value = "";
        document.getElementById("nombreReserva").value = "";
      } else {
        document.getElementById("resultadoReserva").textContent = `Error: ${data.error}`;
      }
    } catch (error) {
      document.getElementById("resultadoReserva").textContent = "Error al comunicarse con el servidor.";
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
  