# Latiax Restaurant Assistant

Sistema asistente inteligente para la gestión de restaurantes, basado en IA con Gemini de Google.

## Características principales

- **Asistente de chat**: Interacción natural con clientes para gestionar reservas y brindar información del restaurante.
- **Integración con Gemini AI**: Procesamiento de lenguaje natural avanzado para entender y responder consultas complejas.
- **Reservas inteligentes**: Sistema de reservas que verifica disponibilidad en tiempo real.
- **Menú digital**: Gestión completa del menú del restaurante con categorías y platos.
- **Confirmación por email**: Envío automático de emails de confirmación para reservas.

## Estructura del proyecto

El proyecto está organizado en las siguientes carpetas principales:

- **frontend/**: Interfaz de usuario y lógica del cliente
  - **js/**: Scripts JavaScript para la funcionalidad del frontend
  - **css/**: Estilos y diseño de la aplicación
  - **images/**: Recursos gráficos
  - **admin/**: Panel de administración

- **backend/**: Lógica del servidor y conexión con servicios externos
  - **controllers/**: Controladores para diferentes funcionalidades
  - **routes/**: Definición de rutas de la API
  - **prompts/**: Instrucciones para el modelo de IA
  - **utils/**: Funciones de utilidad
  - **tests/**: Pruebas de integración y robustez
  - **tts/**: Servicios de conversión de texto a voz

- **server/**: Configuraciones para despliegue en producción

## Configuración

1. Clonar el repositorio
2. Instalar las dependencias:
```bash
cd backend
npm install
```

3. Configurar las variables de entorno en el archivo `backend/key.env`:
```
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
ELEVENLABS_API_KEY=your_elevenlabs_key
```

4. Iniciar el servidor:
```bash
cd backend
node server.js
```

5. Acceder a la aplicación en `http://localhost:3000`

## Pruebas de integración

Se han implementado pruebas automatizadas para verificar la correcta integración entre los diferentes componentes del sistema:

1. **Firestore**: Verifica la conexión con la base de datos y operaciones CRUD.
2. **Email**: Comprueba la configuración del servicio de email y la capacidad de enviar confirmaciones.
3. **Gemini AI**: Verifica la conexión con la API de IA y el procesamiento de solicitudes.

Para ejecutar las pruebas:

```bash
cd backend
node tests/run-tests.js
```

El script generará un informe HTML detallado con los resultados en `backend/tests/integration-report.html`.

## Mejora de robustez

Para garantizar el correcto funcionamiento del sistema en producción, se han implementado las siguientes mejoras:

1. **Validación de integración**: Pruebas automáticas para verificar la correcta integración entre componentes.
2. **Manejo de errores mejorado**: Captura y registro detallado de errores en todas las operaciones críticas.
3. **Logging centralizado**: Sistema de registro unificado para facilitar el diagnóstico de problemas.
4. **Verificación de dependencias**: Comprobación automática de las dependencias necesarias para el funcionamiento del sistema.
5. **Informes detallados**: Generación de informes HTML con los resultados de las pruebas y recomendaciones.

## Archivos relevantes e innecesarios

### Archivos relevantes críticos:
- `backend/controllers/*.js`: Controladores para las diferentes funcionalidades del sistema.
- `backend/firebase.js`: Configuración de conexión con Firebase.
- `backend/emailService.js`: Servicio para envío de emails de confirmación.
- `backend/proxy.js`: Implementación del proxy para comunicación con Gemini.
- `backend/server.js`: Servidor principal de la aplicación.
- `frontend/js/chat.js`: Lógica del chat para interacción con el usuario.

### Archivos que pueden eliminarse:
- `backend/server-testing.js`: Versión alternativa del servidor usado solo para pruebas.
- `backend/server_simple.js`: Versión simplificada del servidor no usada en producción.
- `backend/backend/`: Subdirectorio redundante.
- `backup/`: Solo conservar como referencia temporal, pero puede eliminarse después de confirmar que todo funciona correctamente.

## Licencia

Este proyecto es propiedad de Latiax y está protegido por derechos de autor. No se permite su distribución o uso sin autorización explícita. 