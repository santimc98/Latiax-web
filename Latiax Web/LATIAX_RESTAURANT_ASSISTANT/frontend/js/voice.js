console.log('DEBUG: Cargando voice.js...'); // <-- LOG 1: Carga del script

document.addEventListener('DOMContentLoaded', () => {
    console.log('DEBUG: DOMContentLoaded disparado para voice.js'); // <-- LOG 2: Evento DOM listo

    // Verificar que la configuración global esté disponible
    if (!window.LATIAX_CONFIG) {
        console.error('ERROR: La configuración global no está disponible. Asegúrate de que config.js se cargue antes que voice.js');
        return;
    }
    
    // Acceder a las constantes desde el objeto global
    const CHAT_API_URL = window.LATIAX_CONFIG.CHAT_API_URL;
    const BACKEND_URL = window.LATIAX_CONFIG.BACKEND_URL;
    
    console.log('DEBUG: CHAT_API_URL en voice.js:', CHAT_API_URL);
    console.log('DEBUG: BACKEND_URL en voice.js:', BACKEND_URL);

    // Variables para el modal de voz
    const modal = document.getElementById('voiceModal');
    const fabButton = document.getElementById('voiceFAB');
    const closeButton = document.getElementById('voiceCloseButton');
    const transcriptArea = document.getElementById('voiceTranscript');
    const statusDisplay = document.getElementById('voiceStatus');
    const micButton = document.getElementById('micButton');
    const languageSelector = document.getElementById('languageSelector');
    
    // Variables para el reconocimiento de voz
    let recognition = null;
    let isRecognizing = false;
    let isContinuousModeActive = false;
    
    // Variable para mantener una sesión única para toda la conversación
    let sessionId = 'voice_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    console.log('Sesión de voz iniciada con ID:', sessionId);
    
    // Historial de mensajes para mantener el contexto de la conversación
    let conversationHistory = [];
    
    // Verificar si los elementos existen
    if (!modal || !fabButton) {
        console.log('Elementos principales del modal de voz no encontrados.');
        
        // Si el botón existe pero el modal no, configurar una alerta
        if (fabButton) {
            fabButton.addEventListener('click', (e) => {
                e.preventDefault();
                alert("El asistente de voz está disponible solo en la versión completa.");
            });
        }
        return;
    }
    
    console.log('Elementos del modal de voz encontrados correctamente.');
    
    // Inicializar el reconocimiento de voz si está disponible
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'es-ES';
        
        // Evento cuando se detecta un resultado de voz
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Reconocimiento de voz:', transcript);
            
            // Añadir mensaje del usuario
            addMessageToTranscript(transcript, 'user');
            
            // Generar respuesta usando Gemini
            getVoiceResponse(transcript).then(response => {
                // Asegurarnos de detener el reconocimiento mientras habla el asistente
                if (isRecognizing && recognition) {
                    recognition.stop();
                }
                
                // Reproducir respuesta con voz
                return playVoiceLocal(response).then(() => {
                    // Reiniciar reconocimiento automáticamente si está en modo continuo
                    if (isContinuousModeActive) {
                        console.log('Reactivando reconocimiento en modo continuo después de respuesta');
                        setTimeout(() => {
                            try {
                                if (recognition && !isRecognizing) {
                                    recognition.start();
                                    if (statusDisplay) {
                                        statusDisplay.textContent = 'Modo continuo activo - Escuchando...';
                                    }
                                    updateMicButtonAppearance();
                                }
                            } catch (error) {
                                console.error('Error al reiniciar reconocimiento en modo continuo:', error);
                            }
                        }, 500); // Breve pausa para evitar conflictos
                    }
                });
            });
            
            if (statusDisplay) {
                statusDisplay.textContent = 'Procesando...';
            }
        };
        
        // Eventos de control del reconocimiento
        recognition.onstart = () => {
            isRecognizing = true;
            if (statusDisplay) {
                statusDisplay.textContent = isContinuousModeActive ? 
                    'Modo continuo activo - Escuchando...' : 'Escuchando...';
            }
            updateMicButtonAppearance();
            console.log('Reconocimiento iniciado. Modo continuo:', isContinuousModeActive);
        };
        
        recognition.onend = () => {
            console.log('Reconocimiento finalizado. Modo continuo:', isContinuousModeActive);
            isRecognizing = false;
            
            // Solo en modo no continuo, o si hubo un error, mostramos "Listo"
            if (statusDisplay && !isContinuousModeActive) {
                statusDisplay.textContent = 'Listo';
            }
            
            updateMicButtonAppearance();
            
            // Si está en modo continuo y no estamos procesando una respuesta, reiniciar automáticamente
            if (isContinuousModeActive && statusDisplay && statusDisplay.textContent !== 'Procesando...') {
                console.log('Reiniciando reconocimiento automáticamente (modo continuo)');
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (error) {
                        console.error('Error al reiniciar reconocimiento en modo continuo (onend):', error);
                        isContinuousModeActive = false;
                        updateMicButtonAppearance();
                        if (statusDisplay) {
                            statusDisplay.textContent = 'Error en modo continuo';
                        }
                    }
                }, 300);
            }
        };
        
        recognition.onerror = (event) => {
            console.error('Error en reconocimiento de voz:', event.error);
            isRecognizing = false;
            if (statusDisplay) {
                statusDisplay.textContent = 'Error: ' + event.error;
            }
            if (micButton) {
                micButton.classList.remove('active');
            }
        };
    } else {
        console.log('Reconocimiento de voz no soportado en este navegador.');
    }
    
    // Función para añadir mensaje al transcript
    function addMessageToTranscript(text, sender) {
        if (!transcriptArea) return;
        
        const messageElement = document.createElement('p');
        messageElement.textContent = text;
        
        if (sender === 'user') {
            messageElement.className = 'voice-user-message';
            // Guardar mensaje del usuario en el historial
            conversationHistory.push({
                role: 'user',
                content: text
            });
        } else if (sender === 'system') {
            messageElement.className = 'voice-system-message';
            // No guardamos mensajes del sistema en el historial
        } else {
            messageElement.className = 'voice-bot-message';
            // Guardar mensaje del asistente en el historial
            conversationHistory.push({
                role: 'assistant',
                content: text
            });
        }
        
        transcriptArea.appendChild(messageElement);
        transcriptArea.scrollTop = transcriptArea.scrollHeight;
        
        // Si está en modo continuo, agregamos un indicador de escucha
        if (isContinuousModeActive && sender !== 'system') {
            const listeningIndicator = document.createElement('p');
            listeningIndicator.className = 'voice-system-message voice-listening-indicator';
            listeningIndicator.innerHTML = '<small><i class="fas fa-headset"></i> Modo continuo activo - Puedes seguir hablando...</small>';
            transcriptArea.appendChild(listeningIndicator);
            transcriptArea.scrollTop = transcriptArea.scrollHeight;
        }
        
        console.log(`Historial actualizado. Ahora tiene ${conversationHistory.length} mensajes`);
    }
    
    // Función para generar respuestas predefinidas según el input
    function getVoiceResponse(input) {
        const inputLower = input.toLowerCase();
        
        // Usar el chatApiUrl desde la configuración global
        const chatApiUrl = CHAT_API_URL;
        console.log('DEBUG: Usando CHAT_API_URL para petición:', chatApiUrl);
        
        // Mostrar indicador de carga
        if (statusDisplay) {
            statusDisplay.textContent = 'Procesando...';
        }
        
        // Desactivar temporalmente el micrófono durante la espera
        if (recognition && isRecognizing) {
            recognition.stop();
        }
        
        // Realizamos la petición al servidor
        return fetch(chatApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: input,
                sessionId: sessionId, // Usar la misma sesión para toda la conversación
                messages: conversationHistory.length > 0 ? conversationHistory : null, // Enviar historial si existe
                clientInfo: {
                    interface: 'voice_assistant',
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
            console.log('Respuesta recibida:', data);
            
            // Actualizar estado UI
            if (statusDisplay) {
                statusDisplay.textContent = 'Respuesta recibida';
            }
            
            // Verificamos si tenemos una respuesta válida (puede estar en data.response o data.message)
            const botResponse = data.response || data.message || 'Lo siento, no pude procesar tu consulta.';
            
            // Añadir mensaje del bot
            addMessageToTranscript(botResponse, 'bot');
            
            // Reiniciar reconocimiento si estaba en modo continuo
            if (isContinuousModeActive && !isRecognizing && recognition) {
                try {
                    recognition.start();
                    if (statusDisplay) {
                        statusDisplay.textContent = 'Modo continuo activo - Escuchando...';
                    }
                    updateMicButtonAppearance();
                } catch (error) {
                    console.error('Error al reiniciar reconocimiento:', error);
                }
            } else {
                if (statusDisplay) {
                    statusDisplay.textContent = 'Listo';
                }
            }
            
            return botResponse;
        })
        .catch(error => {
            console.error('Error al obtener respuesta:', error);
            
            // Mensaje de error para el usuario
            const errorMessage = 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo.';
            addMessageToTranscript(errorMessage, 'bot');
            
            if (statusDisplay) {
                statusDisplay.textContent = 'Error: No se pudo conectar';
            }
            
            // Reiniciar reconocimiento si estaba en modo continuo
            if (isContinuousModeActive && !isRecognizing && recognition) {
                setTimeout(() => {
                    try {
                        recognition.start();
                        updateMicButtonAppearance();
                    } catch (error) {
                        console.error('Error al reiniciar reconocimiento:', error);
                    }
                }, 2000);
            }
            
            return errorMessage;
        });
    }
    
    // Configurar el botón principal para mostrar el modal
    fabButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Generar un nuevo sessionId cada vez que se abre el modal
        sessionId = 'voice_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        console.log('Nueva sesión de voz iniciada con ID:', sessionId);
        
        // Reiniciar historial de conversación
        conversationHistory = [];
        
        // Mostrar modal
        modal.style.display = 'flex';
        modal.classList.add('show');
        console.log('Modal de voz abierto');
        
        // Añadir mensaje de bienvenida
        if (transcriptArea) {
            // Limpiar mensajes previos
            transcriptArea.innerHTML = '';
            
            // Mensaje inicial
            const welcomeMessage = '¡Hola! Soy el asistente de voz del Restaurante El Faro. ¿En qué puedo ayudarte?';
            
            // Añadir mensaje de bienvenida
            addMessageToTranscript(welcomeMessage, 'bot');
            
            // Añadir indicaciones para el modo continuo
            const helpMessage = document.createElement('p');
            helpMessage.className = 'voice-system-message';
            helpMessage.innerHTML = '<small>Presiona el botón del micrófono una vez para activar el modo de escucha continua. El icono cambiará a <i class="fas fa-headset"></i> para indicar que puedes hablar sin presionar el botón cada vez.</small>';
            transcriptArea.appendChild(helpMessage);
            
            // Reproducir mensaje de bienvenida
            playVoiceLocal(welcomeMessage);
        }
        
        // Actualizar estado
        if (statusDisplay) {
            statusDisplay.textContent = 'Listo';
        }
    });
    
    // Configurar el botón de cerrar
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
            modal.classList.remove('show');
            console.log('Modal de voz cerrado');
            
            // Detener reconocimiento si está activo y desactivar modo continuo
            resetRecognition();
        });
    }
    
    // Función para actualizar apariencia del botón según estado
    function updateMicButtonAppearance() {
        if (!micButton) return;
        
        if (isContinuousModeActive) {
            // En modo continuo, usar color diferente y cambiar el icono
            micButton.classList.add('active');
            micButton.classList.add('continuous');
            micButton.innerHTML = '<i class="fas fa-headset"></i>';
            micButton.title = "Desactivar escucha continua";
        } else if (isRecognizing) {
            // En modo normal de escucha, usar apariencia estándar de activo
            micButton.classList.add('active');
            micButton.classList.remove('continuous');
            micButton.innerHTML = '<i class="fas fa-stop"></i>';
            micButton.title = "Detener escucha";
        } else {
            // Inactivo
            micButton.classList.remove('active');
            micButton.classList.remove('continuous');
            micButton.innerHTML = '<i class="fas fa-microphone"></i>';
            micButton.title = "Activar escucha continua";
        }
    }
    
    // Configurar el botón de micrófono
    if (micButton && recognition) {
        micButton.addEventListener('click', () => {
            if (isRecognizing || isContinuousModeActive) {
                // Detener reconocimiento y desactivar modo continuo
                console.log('Deteniendo reconocimiento y desactivando modo continuo');
                isContinuousModeActive = false;
                if (recognition) {
                    try {
                        recognition.stop();
                    } catch (error) {
                        console.error('Error al detener reconocimiento:', error);
                    }
                }
                
                if (statusDisplay) {
                    statusDisplay.textContent = 'Modo continuo desactivado';
                    setTimeout(() => {
                        if (statusDisplay && !isRecognizing) {
                            statusDisplay.textContent = 'Listo';
                        }
                    }, 1500);
                }
            } else {
                // Iniciar reconocimiento en modo continuo
                try {
                    // Actualizar idioma si hay selector
                    if (languageSelector) {
                        recognition.lang = languageSelector.value;
                    }
                    
                    console.log('Activando modo continuo');
                    isContinuousModeActive = true; // Activar modo continuo
                    
                    // Si no está reconociendo, iniciar
                    if (!isRecognizing) {
                        recognition.start();
                    }
                    
                    if (statusDisplay) {
                        statusDisplay.textContent = 'Modo continuo activado - Escuchando...';
                    }
                } catch (error) {
                    console.error('Error al iniciar reconocimiento:', error);
                    
                    if (statusDisplay) {
                        statusDisplay.textContent = 'Error al iniciar modo continuo';
                    }
                    
                    isContinuousModeActive = false;
                }
            }
            
            // Actualizar apariencia
            updateMicButtonAppearance();
        });
    } else if (micButton) {
        // Si no hay reconocimiento pero sí hay botón
        micButton.addEventListener('click', () => {
            if (statusDisplay) {
                statusDisplay.textContent = 'Reconocimiento de voz no disponible en este navegador';
            }
            
            // Simular una consulta
            const exampleQuery = '¿Podría reservar una mesa para mañana?';
            addMessageToTranscript(exampleQuery, 'user');
            
            // Usar el endpoint real de chat
            getVoiceResponse(exampleQuery).then(response => {
                // Reproducir respuesta con voz
                return playVoiceLocal(response);
            });
        });
    }
    
    // Configurar selector de idioma si existe
    if (languageSelector && recognition) {
        languageSelector.addEventListener('change', () => {
            recognition.lang = languageSelector.value;
            console.log('Idioma cambiado a:', languageSelector.value);
        });
    }
    
    // Implementar funciones de síntesis de voz local
    if (typeof window.playVoiceLocal !== 'function') {
        window.playVoiceLocal = function(text) {
            return new Promise((resolve, reject) => {
                try {
                    if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(text);
                        utterance.lang = 'es-ES';
                        utterance.rate = 1.0;
                        
                        utterance.onend = () => {
                            resolve();
                        };
                        
                        utterance.onerror = (error) => {
                            console.error('Error en síntesis de voz:', error);
                            reject(error);
                        };
                        
                        speechSynthesis.speak(utterance);
                    } else {
                        console.warn('Síntesis de voz no soportada en este navegador');
                        resolve(); // Resolvemos sin error para que la aplicación continúe
                    }
                } catch (error) {
                    console.error('Error al reproducir voz localmente:', error);
                    reject(error);
                }
            });
        };
    }

    // Reemplazamos la función global playVoice para que siempre use nuestra versión local
    window.playVoice = function(text) {
        console.log("Usando síntesis de voz local en lugar de backend");
        return window.playVoiceLocal(text);
    };

    // Añadir un método para limpiar y restablecer el reconocimiento
    function resetRecognition() {
        if (isRecognizing) {
            recognition.stop();
        }
        isRecognizing = false;
        isContinuousModeActive = false;
        if (statusDisplay) {
            statusDisplay.textContent = 'Listo';
        }
        updateMicButtonAppearance();
    }
}); 