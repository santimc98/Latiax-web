/**
 * LATIAX - Configuración global del frontend
 * Este archivo contiene las constantes comunes para toda la aplicación
 */

// Verificar si ya existe una configuración global para evitar redefinir
if (typeof window.LATIAX_CONFIG === 'undefined') {
    
    // Configuración global para todos los archivos JavaScript
    const BACKEND_URL = 'https://backend-latiax-assistant.onrender.com';
    console.log('Inicializando configuración. BACKEND_URL:', BACKEND_URL);

    // Endpoints principales
    const CHAT_API_URL = `${BACKEND_URL}/chat`;
    const TEST_CONNECTION_URL = `${BACKEND_URL}/chat/test-connection`;
    const TTS_API_URL = `${BACKEND_URL}/tts`;
    const MENU_INFO_URL = `${BACKEND_URL}/chat/menu-info`;
    const CLEAR_CONTEXT_URL = `${BACKEND_URL}/chat/clear-context`;
    const RESERVAS_URL = `${BACKEND_URL}/reservas`;
    const HORAS_DISPONIBLES_URL = (fecha, personas) => `${BACKEND_URL}/reservas/horas-disponibles/${fecha}/${personas}`;
    const RESERVAS_POR_FECHA_URL = (fecha) => `${BACKEND_URL}/reservas/fecha/${fecha}`;
    const RESERVA_POR_ID_URL = (id) => `${BACKEND_URL}/reservas/${id}`;
    
    // Guardar configuración en objeto global para verificar inicialización
    window.LATIAX_CONFIG = {
        initialized: true,
        BACKEND_URL,
        CHAT_API_URL,
        TEST_CONNECTION_URL,
        TTS_API_URL,
        MENU_INFO_URL,
        CLEAR_CONTEXT_URL,
        RESERVAS_URL,
        HORAS_DISPONIBLES_URL,
        RESERVAS_POR_FECHA_URL,
        RESERVA_POR_ID_URL
    };
    
    // Función de ayuda para verificar conexión al backend
    window.checkBackendConnection = async function() {
        try {
            const response = await fetch(`${BACKEND_URL}/chat/test-connection`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                // Agregar timeout para evitar espera infinita
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                console.log('Conexión con el backend establecida correctamente');
                return true;
            } else {
                console.error('Error al conectar con el backend:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Error de conexión con el backend:', error);
            return false;
        }
    }
    
    // Log para confirmar que la configuración se ha cargado
    console.log('Configuración global inicializada correctamente');
} else {
    console.warn('La configuración global ya está inicializada. Evitando redefinición.');
} 