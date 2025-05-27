console.log('DEBUG: Cargando phone-demo.js...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DEBUG: DOMContentLoaded disparado para phone-demo.js');

    // Verificar que la configuración global esté disponible
    if (!window.LATIAX_CONFIG) {
        console.error('ERROR: La configuración global no está disponible en phone-demo.js. Asegúrate de que config.js se cargue primero.');
        return;
    }
    
    // Acceder a las constantes desde el objeto global
    const CHAT_API_URL = window.LATIAX_CONFIG.CHAT_API_URL;
    const BACKEND_URL = window.LATIAX_CONFIG.BACKEND_URL;
    
    console.log('DEBUG: CHAT_API_URL en phone-demo.js:', CHAT_API_URL);
    console.log('DEBUG: BACKEND_URL en phone-demo.js:', BACKEND_URL);

    // --- Elementos del DOM de la Demo Telefónica ---
    const answerButton = document.getElementById('answerButton');
    const hangupButton = document.getElementById('hangupButton');
    const initialActions = document.getElementById('initialActions');
    const conversationView = document.getElementById('conversationView');
    const callStatusDisplay = document.getElementById('callStatus'); // Estado general de la llamada
    const micButton = document.getElementById('phoneMicButton');
    const transcriptArea = document.getElementById('transcriptArea');
    const micStatusDisplay = document.getElementById('phoneMicStatus'); // Estado específico del micro/reconocimiento
    const languageSelector = document.getElementById('phoneLanguageSelector');

    // Verificar que los elementos principales existen
    if (!answerButton || !hangupButton || !initialActions || !conversationView || !callStatusDisplay || !micButton || !transcriptArea || !micStatusDisplay || !languageSelector) {
        console.error("Error crítico: No se encontraron todos los elementos necesarios en phone-demo.html");
        if(callStatusDisplay) callStatusDisplay.textContent = "Error de interfaz";
        return; // Detener si falta algo esencial
    }
    console.log("Elementos de la demo encontrados.");

    // --- Estado de la Aplicación ---
    let recognition;
    let isRecognizing = false;
    let currentAudio = null; 
    let conversationHistory = [];
    
    // --- Comprobar compatibilidad SpeechRecognition ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.error('Speech Recognition API no soportada.');
        micStatusDisplay.textContent = 'Voz no soportada';
        if(micButton) micButton.disabled = true;
        // No deshabilitar el botón de respuesta para permitir demo sin voz
        if(callStatusDisplay) callStatusDisplay.textContent = "Reconocimiento de voz no disponible en este navegador.";
    } else {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = languageSelector.value;
        console.log('Speech Recognition API soportada (Demo Teléfono).');
    }

    // --- Funciones Auxiliares Específicas de la Demo ---
    function addMessageToDemoTranscript(text, sender) {
        if (!transcriptArea) return;
        
        const messageElement = document.createElement('p');
        messageElement.textContent = text;
        
        if (sender === 'user') {
            messageElement.className = 'user-speech';
            // Guardar mensaje del usuario en el historial
            conversationHistory.push({
                role: 'user',
                content: text
            });
        } else {
            messageElement.className = 'bot-speech';
            // Guardar mensaje del asistente en el historial
            conversationHistory.push({
                role: 'assistant',
                content: text
            });
        }
        
        transcriptArea.appendChild(messageElement);
        transcriptArea.scrollTop = transcriptArea.scrollHeight;
        
        console.log(`Historial de conversación telefónica actualizado. Ahora tiene ${conversationHistory.length} mensajes`);
    }

    function updateMicStatus(message) {
        micStatusDisplay.textContent = message;
    }

    function setMicButtonState(isActive) {
        if (!micButton) return;
        if (isActive) {
            micButton.classList.add('active');
            micButton.innerHTML = '<i class="fas fa-stop"></i>';
            micButton.title = "Detener escucha";
        } else {
            micButton.classList.remove('active');
            micButton.innerHTML = '<i class="fas fa-microphone"></i>';
            micButton.title = "Hablar";
        }
    }

    // Variable para mantener una sesión única para toda la conversación
    let sessionId = 'phone_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    console.log('Sesión telefónica iniciada con ID:', sessionId);

    // --- Función para enviar mensaje al API de chat y obtener respuesta
    function getPhoneResponse(userMessage) {
        console.log('Enviando mensaje al servidor:', userMessage);
        
        // Usar chatApiUrl desde la configuración global
        const chatApiUrl = CHAT_API_URL;
        console.log('DEBUG: Usando CHAT_API_URL para petición telefónica:', chatApiUrl);
        
        // Actualizar estado UI
        updateMicStatus('Procesando...');
        
        // Desactivar micrófono durante procesamiento
        setMicButtonState(false);
        
        // Realizar petición al servidor 
        return fetch(chatApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: userMessage,
                sessionId: sessionId, // Usar la misma sesión para toda la conversación
                messages: conversationHistory.length > 0 ? conversationHistory : null, // Enviar historial si existe
                clientInfo: {
                    interface: 'phone_call',
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                }
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la respuesta: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Respuesta recibida del servidor:', data);
            
            // Verificar estructura de la respuesta (puede estar en data.response o data.message)
            const botResponse = data.response || data.message || 'Lo siento, no pude procesar tu consulta.';
            
            // Actualizar estado
            updateMicStatus('Conectado');
            
            return botResponse;
        })
        .catch(error => {
            console.error('Error al comunicarse con el servidor:', error);
            updateMicStatus('Error de conexión');
            
            // Respuesta de error para el usuario
            return 'Lo siento, ha ocurrido un error al procesar tu mensaje. Nuestros sistemas están teniendo dificultades en este momento.';
        });
    }

    // --- Función para reproducir voz ---
    async function speakBotResponseDemo(text) {
        updateMicStatus('Hablando...');
        setMicButtonState(false);
        
        try {
            if (currentAudio && !currentAudio.paused) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
            
            console.log("Reproduciendo respuesta...");
            
            // Usar la función playVoiceLocal o la API de síntesis de voz directamente
            if (typeof playVoiceLocal === 'function') {
                currentAudio = await playVoiceLocal(text);
            } else if (typeof playVoice === 'function') {
                currentAudio = await playVoice(text);
            } else if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = languageSelector.value;
                utterance.rate = 0.9; // Ligeramente más lento para mejor comprensión
                
                window.speechSynthesis.speak(utterance);
                currentAudio = utterance;
                
                return new Promise((resolve) => {
                    utterance.onend = () => {
                        updateMicStatus('Listo');
                        resolve(utterance);
                    };
                    
                    utterance.onerror = (e) => {
                        console.error("Error en síntesis de voz:", e);
                        updateMicStatus('Error de voz');
                        resolve(null);
                    };
                });
            } else {
                console.warn('Síntesis de voz no disponible');
                setTimeout(() => {
                    updateMicStatus('Listo');
                }, 1000);
                return null;
            }
            
            updateMicStatus('Listo');
            return currentAudio;
        } catch (error) {
            console.error("Error reproduciendo respuesta:", error);
            updateMicStatus('Error de voz');
            return null;
        }
    }

    // --- Eventos de SpeechRecognition ---
    if (recognition) {
        recognition.onstart = () => {
            isRecognizing = true;
            updateMicStatus('Escuchando...');
            setMicButtonState(true);
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript.trim();
            console.log('Reconocimiento de voz:', transcript);
            
            // Mostrar mensaje del usuario
            addMessageToDemoTranscript(transcript, 'user');
            
            // Desactivar el micrófono mientras se procesa la respuesta
            setMicButtonState(false);
            
            // Obtener respuesta conectando con Gemini
            getPhoneResponse(transcript).then(response => {
                // Mostrar respuesta del bot
                addMessageToDemoTranscript(response, 'bot');
                
                // Reproducir respuesta
                return speakBotResponseDemo(response);
            })
            .finally(() => {
                // Reactivar micrófono al terminar
                setMicButtonState(true);
            });
        };

        recognition.onerror = (event) => {
            console.error('Error en reconocimiento:', event.error);
            isRecognizing = false;
            updateMicStatus('Error: ' + event.error);
            setMicButtonState(false);
        };

        recognition.onend = () => {
            isRecognizing = false;
            if (micStatusDisplay.textContent === 'Escuchando...') {
                updateMicStatus('Listo');
            }
            setMicButtonState(false);
        };
    }

    // --- Eventos de UI ---
    // Botón para responder la llamada
    answerButton.addEventListener('click', async () => {
        answerButton.disabled = true;
        callStatusDisplay.textContent = 'Conectando...';
        
        // Generar un nuevo ID de sesión para cada llamada
        sessionId = 'phone_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        console.log('Nueva sesión telefónica iniciada con ID:', sessionId);
        
        // Limpiar historial de conversación
        conversationHistory = [];
        
        // Mostrar la vista de conversación y ocultar las acciones iniciales
        setTimeout(() => {
            initialActions.style.display = 'none';
            conversationView.style.display = 'block';
            callStatusDisplay.textContent = 'Llamada en curso';
            updateMicStatus('Conectado');
            
            // Mensaje inicial automatizado
            const welcomeMessage = "Buenas tardes, gracias por llamar al Restaurante El Faro. ¿En qué puedo ayudarle?";
            addMessageToDemoTranscript(welcomeMessage, 'bot');
            speakBotResponseDemo(welcomeMessage);
        }, 1000);
    });
    
    // Botón para colgar
    hangupButton.addEventListener('click', () => {
        resetDemo();
    });
    
    // Botón de micrófono
    micButton.addEventListener('click', () => {
        if (isRecognizing) {
            if (recognition) recognition.stop();
        } else {
            if (recognition) {
                try {
                    recognition.lang = languageSelector.value;
                    recognition.start();
                } catch (error) {
                    console.error("Error iniciando reconocimiento:", error);
                    updateMicStatus('Error al iniciar');
                    
                    // Si falla, ofrecer mensaje de ejemplo
                    setTimeout(() => {
                        const demoMessage = "Quisiera hacer una reserva para mañana";
                        addMessageToDemoTranscript(demoMessage, 'user');
                        
                        // Obtener respuesta del servidor
                        getPhoneResponse(demoMessage)
                            .then(response => {
                                addMessageToDemoTranscript(response, 'bot');
                                return speakBotResponseDemo(response);
                            })
                            .finally(() => {
                                setMicButtonState(true);
                            });
                    }, 1000);
                }
            } else {
                // Sin reconocimiento disponible, simular con un mensaje predefinido
                updateMicStatus('Demo (sin reconocimiento)');
                
                setTimeout(() => {
                    const demoMessage = "Quisiera hacer una reserva para mañana";
                    addMessageToDemoTranscript(demoMessage, 'user');
                    
                    // Obtener respuesta del servidor
                    getPhoneResponse(demoMessage)
                        .then(response => {
                            addMessageToDemoTranscript(response, 'bot');
                            return speakBotResponseDemo(response);
                        })
                        .finally(() => {
                            setMicButtonState(true);
                        });
                }, 1000);
            }
        }
    });
    
    // Selector de idioma
    languageSelector.addEventListener('change', () => {
        if (recognition) {
            recognition.lang = languageSelector.value;
            console.log(`Idioma cambiado a: ${languageSelector.value}`);
        }
    });

    // --- Función para resetear la demo ---
    function resetDemo() {
        console.log('Reseteando demo de teléfono');
        
        // Generar un nuevo ID de sesión
        sessionId = 'phone_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        console.log('Nueva sesión telefónica iniciada con ID:', sessionId);
        
        // Reiniciar historial de conversación
        conversationHistory = [];
        
        // Detener reconocimiento si está activo
        if (recognition && isRecognizing) {
            recognition.stop();
        }
        
        // Limpiar interfaz
        if (transcriptArea) transcriptArea.innerHTML = '';
        if (callStatusDisplay) callStatusDisplay.textContent = 'Llamada finalizada';
        
        // Reestablecer vista inicial
        if (initialActions) initialActions.style.display = 'block';
        if (conversationView) conversationView.style.display = 'none';
        if (answerButton) answerButton.disabled = false;
        
        // Actualizar estado del micrófono
        updateMicStatus('Desconectado');
        setMicButtonState(false);
        
        // Esperar un momento y reestablecer estado de llamada
        setTimeout(() => {
            if (callStatusDisplay) callStatusDisplay.textContent = 'Llamada entrante...';
        }, 2000);
    }
}); 