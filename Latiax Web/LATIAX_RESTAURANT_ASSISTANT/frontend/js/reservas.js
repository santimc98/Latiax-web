/**
 * LATIAX - Sistema Profesional de Gestión para Restaurantes
 * Módulo de Reservas - v1.0
 */

// Usa las constantes de config.js
// (BACKEND_URL, RESERVAS_URL, HORAS_DISPONIBLES_URL, RESERVAS_POR_FECHA_URL, RESERVA_POR_ID_URL)

// Configuración de la API (reemplazando API_BASE_URL)
// const API_BASE_URL = "http://localhost:3000"; // <-- COMENTAR ESTA LÍNEA

// Estado global para reservas
const estadoReservas = {
    reservaSeleccionada: null,
    reservas: [],
    cargando: false
};

/**
 * Consultar reservas por fecha y hora
 */
async function consultarReservas() {
    try {
        mostrarCargando('resultadoConsulta');
        
        const fecha = document.getElementById("fechaConsulta").value;
        const hora = document.getElementById("horaConsulta").value;
        
        // Validación básica
        if (!fecha) {
            mostrarError('resultadoConsulta', 'Por favor, seleccione una fecha para consultar');
            return;
        }
        
        // Construir URL
        const url = `${API_BASE_URL}${API_ENDPOINTS.reservas}?fecha=${fecha}${hora ? `&hora=${hora}` : ''}`;
        
        // Realizar petición
        const respuesta = await fetch(url);
        
        // Verificar respuesta
        if (!respuesta.ok) {
            const error = await respuesta.json();
            throw new Error(error.error || 'Error al consultar reservas');
        }
        
        // Procesar datos
        const datos = await respuesta.json();
        estadoReservas.reservas = datos.reservas || [];
        
        // Renderizar resultados
        renderizarReservas(estadoReservas.reservas, 'resultadoConsulta');
        
    } catch (error) {
        console.error('Error al consultar reservas:', error);
        mostrarError('resultadoConsulta', `Error: ${error.message}`);
    }
}

/**
 * Guardar una nueva reserva
 */
async function guardarReserva() {
    try {
        mostrarCargando('estadoReserva');
        
        // Obtener datos del formulario
        const nombre = document.getElementById("nombre").value.trim();
        const telefono = document.getElementById("telefono").value.trim();
        const fecha = document.getElementById("fecha").value;
        const hora = document.getElementById("hora").value;
        const mesas = parseInt(document.getElementById("mesas").value);
        const notas = document.getElementById("notas").value.trim();
        
        // Validar datos
        if (!nombre) {
            mostrarError('estadoReserva', 'El nombre es obligatorio');
            return;
        }
        
        if (!telefono) {
            mostrarError('estadoReserva', 'El teléfono de contacto es obligatorio');
            return;
        }
        
        if (!fecha) {
            mostrarError('estadoReserva', 'La fecha es obligatoria');
            return;
        }
        
        if (!hora) {
            mostrarError('estadoReserva', 'La hora es obligatoria');
            return;
        }
        
        if (isNaN(mesas) || mesas <= 0) {
            mostrarError('estadoReserva', 'Debe reservar al menos una mesa');
            return;
        }
        
        // Preparar datos
        const datosReserva = {
            nombre,
            telefono,
            fecha,
            hora,
            mesas,
            notas
        };
        
        // Enviar petición
        const respuesta = await fetch(`${API_BASE_URL}${API_ENDPOINTS.reservas}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosReserva)
        });
        
        // Verificar respuesta
        if (!respuesta.ok) {
            const error = await respuesta.json();
            throw new Error(error.error || 'Error al guardar la reserva');
        }
        
        // Procesar resultado
        const resultado = await respuesta.json();
        
        // Mostrar mensaje de éxito
        mostrarExito('estadoReserva', `${resultado.mensaje}. ID: ${resultado.id}`);
        
        // Limpiar formulario
        limpiarFormularioReserva();
        
    } catch (error) {
        console.error('Error al guardar reserva:', error);
        mostrarError('estadoReserva', `Error: ${error.message}`);
    }
}

/**
 * Buscar reserva por ID
 */
async function buscarReserva() {
    try {
        mostrarCargando('detalleReserva');
        
        const id = document.getElementById("idReserva").value.trim();
        
        if (!id) {
            mostrarError('detalleReserva', 'Por favor, introduzca un ID de reserva');
            return;
        }
        
        // Realizar petición
        const respuesta = await fetch(`${API_BASE_URL}${API_ENDPOINTS.reservas}/${id}`);
        
        // Verificar respuesta
        if (!respuesta.ok) {
            if (respuesta.status === 404) {
                mostrarError('detalleReserva', 'No se encontró ninguna reserva con ese ID');
                return;
            }
            
            const error = await respuesta.json();
            throw new Error(error.error || 'Error al buscar la reserva');
        }
        
        // Procesar datos
        const datos = await respuesta.json();
        estadoReservas.reservaSeleccionada = datos.reserva;
        
        // Mostrar formulario de edición
        mostrarFormularioEdicion(datos.reserva);
        
    } catch (error) {
        console.error('Error al buscar reserva:', error);
        mostrarError('detalleReserva', `Error: ${error.message}`);
    }
}

/**
 * Modificar reserva existente
 */
async function modificarReserva() {
    try {
        if (!estadoReservas.reservaSeleccionada) {
            mostrarError('detalleReserva', 'No hay ninguna reserva seleccionada para modificar');
            return;
        }
        
        mostrarCargando('detalleReserva');
        
        // Obtener datos del formulario
        const nombre = document.getElementById("nombreEdit").value.trim();
        const telefono = document.getElementById("telefonoEdit").value.trim();
        const fecha = document.getElementById("fechaEdit").value;
        const hora = document.getElementById("horaEdit").value;
        const mesas = parseInt(document.getElementById("mesasEdit").value);
        const notas = document.getElementById("notasEdit").value.trim();
        
        // Validar datos
        if (!nombre || !telefono || !fecha || !hora || isNaN(mesas) || mesas <= 0) {
            mostrarError('detalleReserva', 'Todos los campos son obligatorios');
            return;
        }
        
        // Preparar datos
        const datosActualizados = {
            nombre,
            telefono,
            fecha,
            hora,
            mesas,
            notas
        };
        
        // Enviar petición
        const id = estadoReservas.reservaSeleccionada.id;
        const respuesta = await fetch(`${API_BASE_URL}${API_ENDPOINTS.reservas}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosActualizados)
        });
        
        // Verificar respuesta
        if (!respuesta.ok) {
            const error = await respuesta.json();
            throw new Error(error.error || 'Error al modificar la reserva');
        }
        
        // Procesar resultado
        const resultado = await respuesta.json();
        
        // Mostrar mensaje de éxito
        mostrarExito('detalleReserva', `Reserva modificada con éxito`);
        
        // Actualizar reserva seleccionada
        estadoReservas.reservaSeleccionada = resultado.reserva;
        
    } catch (error) {
        console.error('Error al modificar reserva:', error);
        mostrarError('detalleReserva', `Error: ${error.message}`);
    }
}

/**
 * Cancelar reserva
 */
async function cancelarReserva(id) {
    if (!confirm('¿Está seguro de que desea cancelar esta reserva?')) {
        return;
    }
    
    try {
        mostrarCargando('detalleReserva');
        
        // Enviar petición
        const url = API_ENDPOINTS.cancelar.replace('{id}', id);
        const respuesta = await fetch(`${API_BASE_URL}${url}`, {
            method: "POST"
        });
        
        // Verificar respuesta
        if (!respuesta.ok) {
            const error = await respuesta.json();
            throw new Error(error.error || 'Error al cancelar la reserva');
        }
        
        // Procesar resultado
        const resultado = await respuesta.json();
        
        // Mostrar mensaje de éxito
        mostrarExito('detalleReserva', `${resultado.mensaje}`);
        
        // Limpiar formulario y refrescar vista
        document.getElementById('idReserva').value = '';
        document.getElementById('detalleReserva').innerHTML = '<div class="placeholder-text">Reserva cancelada con éxito</div>';
        estadoReservas.reservaSeleccionada = null;
        
    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        mostrarError('detalleReserva', `Error: ${error.message}`);
    }
}

/**
 * Funciones auxiliares para la interfaz
 */

// Mostrar mensaje de carga
function mostrarCargando(elementoId) {
    const elemento = document.getElementById(elementoId);
    if (elemento) {
        elemento.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
    }
}

// Mostrar mensaje de error
function mostrarError(elementoId, mensaje) {
    const elemento = document.getElementById(elementoId);
    if (elemento) {
        elemento.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${mensaje}</div>`;
    }
}

// Mostrar mensaje de éxito
function mostrarExito(elementoId, mensaje) {
    const elemento = document.getElementById(elementoId);
    if (elemento) {
        elemento.innerHTML = `<div class="success-message"><i class="fas fa-check-circle"></i> ${mensaje}</div>`;
    }
}

// Renderizar lista de reservas
function renderizarReservas(reservas, elementoId) {
    const elemento = document.getElementById(elementoId);
    if (!elemento) return;
    
    if (reservas.length === 0) {
        elemento.innerHTML = '<div class="placeholder-text">No se encontraron reservas para la fecha y hora especificadas</div>';
        return;
    }
    
    let html = '<div class="reservas-lista">';
    reservas.forEach(reserva => {
        const estado = reserva.status === 'cancelada' ? 
            '<span class="estado-cancelada">Cancelada</span>' : 
            '<span class="estado-confirmada">Confirmada</span>';
            
        html += `
            <div class="reserva-item">
                <div class="reserva-header">
                    <h4>${reserva.nombre}</h4>
                    ${estado}
                </div>
                <div class="reserva-detalles">
                    <p><i class="fas fa-calendar"></i> ${reserva.fecha} a las ${reserva.hora}</p>
                    <p><i class="fas fa-chair"></i> ${reserva.mesas} mesa${reserva.mesas > 1 ? 's' : ''}</p>
                    ${reserva.telefono ? `<p><i class="fas fa-phone"></i> ${reserva.telefono}</p>` : ''}
                    ${reserva.notas ? `<p><i class="fas fa-sticky-note"></i> ${reserva.notas}</p>` : ''}
                </div>
                <div class="reserva-acciones">
                    <button onclick="mostrarDetalleReserva('${reserva.id}')" class="styled-button">
                        <i class="fas fa-eye"></i> Ver detalles
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    elemento.innerHTML = html;
}

// Mostrar formulario de edición
function mostrarFormularioEdicion(reserva) {
    const elemento = document.getElementById('detalleReserva');
    if (!elemento) return;
    
    const html = `
        <div class="form-group">
            <div class="input-group">
                <i class="fas fa-user"></i>
                <input type="text" id="nombreEdit" value="${reserva.nombre}" class="styled-input">
            </div>
            <div class="input-group">
                <i class="fas fa-phone"></i>
                <input type="text" id="telefonoEdit" value="${reserva.telefono || ''}" class="styled-input">
            </div>
            <div class="input-group">
                <i class="fas fa-calendar"></i>
                <input type="date" id="fechaEdit" value="${reserva.fecha}" class="styled-input">
            </div>
            <div class="input-group">
                <i class="fas fa-clock"></i>
                <input type="time" id="horaEdit" value="${reserva.hora}" class="styled-input">
            </div>
            <div class="input-group">
                <i class="fas fa-users"></i>
                <input type="number" id="mesasEdit" value="${reserva.mesas}" min="1" max="10" class="styled-input">
            </div>
            <div class="input-group">
                <i class="fas fa-sticky-note"></i>
                <textarea id="notasEdit" class="styled-input textarea">${reserva.notas || ''}</textarea>
            </div>
            <div class="button-group">
                <button onclick="modificarReserva()" class="styled-button primary-button">
                    <i class="fas fa-save"></i> Guardar cambios
                </button>
                <button onclick="cancelarReserva('${reserva.id}')" class="styled-button">
                    <i class="fas fa-ban"></i> Cancelar reserva
                </button>
            </div>
        </div>
    `;
    
    elemento.innerHTML = html;
}

// Mostrar detalle de una reserva
function mostrarDetalleReserva(id) {
    document.getElementById("idReserva").value = id;
    document.querySelectorAll('.tab').forEach(tab => {
        if (tab.getAttribute('data-tab') === 'modificar') {
            tab.click();
        }
    });
    buscarReserva();
}

// Limpiar formulario de nueva reserva
function limpiarFormularioReserva() {
    document.getElementById("nombre").value = '';
    document.getElementById("telefono").value = '';
    document.getElementById("fecha").value = new Date().toISOString().split('T')[0];
    document.getElementById("hora").value = '';
    document.getElementById("mesas").value = '';
    document.getElementById("notas").value = '';
}

// Inicializar elementos al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    // Establecer fecha actual
    const today = new Date().toISOString().split('T')[0];
    const fechaConsulta = document.getElementById("fechaConsulta");
    const fecha = document.getElementById("fecha");
    
    if (fechaConsulta) fechaConsulta.value = today;
    if (fecha) fecha.value = today;
    
    // Añadir validación en tiempo real
    const inputs = document.querySelectorAll('.styled-input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.hasAttribute('required') && !this.value) {
                this.classList.add('input-error');
            } else {
                this.classList.remove('input-error');
            }
        });
    });
});

/**
 * Funcionalidades para el módulo de reservas
 * Incluye: Calendario táctil, formulario por pasos y feedback visual
 */

document.addEventListener('DOMContentLoaded', function() {
    initCalendar();
    initStepForm();
    initLoadingIndicators();
    initFormSummary();
});

/**
 * Inicializa el calendario táctil mejorado
 */
function initCalendar() {
    // Elementos del calendario
    const calendarContainer = document.querySelector('.calendar-container');
    if (!calendarContainer) return;
    
    const calendarTitle = document.querySelector('.calendar-title');
    const prevMonthBtn = document.querySelector('.calendar-prev-month');
    const nextMonthBtn = document.querySelector('.calendar-next-month');
    const calendarDates = document.querySelector('.calendar-dates');
    
    // Variables para la fecha actual
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    // Renderizar calendario inicial
    renderCalendar(currentMonth, currentYear);
    
    // Event listeners para navegación
    prevMonthBtn.addEventListener('click', function() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentMonth, currentYear);
    });
    
    nextMonthBtn.addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentMonth, currentYear);
    });
    
    /**
     * Renderiza el calendario con el mes y año dados
     */
    function renderCalendar(month, year) {
        // Nombres de los meses en español
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        // Actualizar título
        calendarTitle.textContent = `${monthNames[month]} ${year}`;
        
        // Calcular primer día del mes
        const firstDay = new Date(year, month, 1).getDay();
        // Ajustar para que la semana comience en lunes (0 = lunes, 6 = domingo)
        const adjustedFirstDay = (firstDay === 0) ? 6 : firstDay - 1;
        
        // Calcular número de días en el mes
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Limpiar días anteriores
        calendarDates.innerHTML = '';
        
        // Días anteriores al mes (del mes anterior)
        const lastMonthDays = new Date(year, month, 0).getDate();
        for (let i = adjustedFirstDay - 1; i >= 0; i--) {
            const dayElement = createDateElement(lastMonthDays - i, 'disabled');
            calendarDates.appendChild(dayElement);
        }
        
        // Días del mes actual
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            let classes = '';
            // Comprobar si es hoy
            if (today.getDate() === i && today.getMonth() === month && today.getFullYear() === year) {
                classes = 'today';
            }
            
            // Comprobar si ya está seleccionado (ejemplo)
            const dateInput = document.querySelector('input[name="fecha"]');
            if (dateInput && dateInput.value) {
                const selectedDate = new Date(dateInput.value);
                if (selectedDate.getDate() === i && selectedDate.getMonth() === month && selectedDate.getFullYear() === year) {
                    classes += ' selected';
                }
            }
            
            // Simular días no disponibles (ejemplo)
            // En producción, esto vendría de una consulta al servidor
            if (year === currentDate.getFullYear() && month === currentDate.getMonth()) {
                // Ejemplo: marcar días pasados como no disponibles
                if (i < currentDate.getDate()) {
                    classes += ' disabled unavailable';
                }
                // Ejemplo: marcar algunos días al azar como no disponibles
                else if ((i + month) % 7 === 3) {
                    classes += ' unavailable';
                }
                // Ejemplo: marcar algunos días como limitados
                else if ((i + month) % 11 === 4) {
                    classes += ' limited';
                }
                // Ejemplo: marcar días disponibles
                else if (i > currentDate.getDate()) {
                    classes += ' available';
                }
            }
            
            const dayElement = createDateElement(i, classes);
            
            // Event listener para selección de fecha solo si no está deshabilitado
            if (!classes.includes('disabled') && !classes.includes('unavailable')) {
                dayElement.addEventListener('click', function() {
                    // Eliminar clase seleccionada de cualquier otro día
                    document.querySelectorAll('.calendar-date.selected').forEach(el => {
                        el.classList.remove('selected');
                    });
                    
                    // Añadir clase seleccionada a este día
                    this.classList.add('selected');
                    
                    // Formatear fecha para el input (YYYY-MM-DD)
                    const selectedMonth = (month + 1).toString().padStart(2, '0');
                    const selectedDay = i.toString().padStart(2, '0');
                    const formattedDate = `${year}-${selectedMonth}-${selectedDay}`;
                    
                    // Actualizar input oculto de fecha
                    const dateInputs = document.querySelectorAll('input[name="fecha"]');
                    dateInputs.forEach(input => {
                        input.value = formattedDate;
                        // Disparar evento de cambio para cualquier listener
                        input.dispatchEvent(new Event('change'));
                    });
                    
                    // Mostrar fecha seleccionada en formato legible
                    const dateDisplays = document.querySelectorAll('.selected-date-display');
                    if (dateDisplays.length > 0) {
                        const dateObj = new Date(year, month, i);
                        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                        const readableDate = dateObj.toLocaleDateString('es-ES', options);
                        
                        dateDisplays.forEach(display => {
                            display.textContent = readableDate;
                            display.style.color = 'var(--secondary-color)';
                        });
                    }
                    
                    // Actualizar resumen de la reserva si existe
                    updateReservationSummary('fecha', readableDate);
                    
                    // Feedback táctil en móviles
                    if ('vibrate' in navigator) {
                        navigator.vibrate(50);
                    }
                });
            }
            
            calendarDates.appendChild(dayElement);
        }
        
        // Determinar cuántos días del próximo mes mostrar
        const totalCells = 42; // 6 filas x 7 días
        const remainingCells = totalCells - (adjustedFirstDay + daysInMonth);
        
        // Días posteriores al mes (del mes siguiente)
        for (let i = 1; i <= remainingCells; i++) {
            const dayElement = createDateElement(i, 'disabled');
            calendarDates.appendChild(dayElement);
        }
    }
    
    /**
     * Crea un elemento de día para el calendario
     */
    function createDateElement(day, classes = '') {
        const dayElement = document.createElement('div');
        dayElement.className = `calendar-date ${classes}`;
        dayElement.textContent = day;
        return dayElement;
    }
}

/**
 * Inicializa el formulario por pasos para móviles
 */
function initStepForm() {
    // Solo inicializar en vista móvil
    if (window.innerWidth > 768) return;
    
    const mobileForm = document.querySelector('.mobile-step-form');
    if (!mobileForm) return;
    
    const steps = mobileForm.querySelectorAll('.form-step');
    const stepDots = document.querySelector('.step-indicator');
    let currentStep = 0;
    
    // Crear indicadores de pasos
    if (stepDots && steps.length > 0) {
        for (let i = 0; i < steps.length; i++) {
            const dot = document.createElement('div');
            dot.className = i === 0 ? 'step-dot active' : 'step-dot';
            stepDots.appendChild(dot);
        }
    }
    
    // Mostrar primer paso
    if (steps.length > 0) {
        steps[0].classList.add('active');
    }
    
    // Event listeners para botones de navegación
    mobileForm.querySelectorAll('.step-next-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            if (validateStep(currentStep)) {
                nextStep();
            }
        });
    });
    
    mobileForm.querySelectorAll('.step-back-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            prevStep();
        });
    });
    
    /**
     * Valida el paso actual del formulario
     */
    function validateStep(stepIndex) {
        const currentStepEl = steps[stepIndex];
        let isValid = true;
        
        // Validar campos requeridos en el paso actual
        currentStepEl.querySelectorAll('input[required], select[required], textarea[required]').forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
                
                // Mostrar mensaje de error si no existe
                let errorMsg = field.nextElementSibling;
                if (!errorMsg || !errorMsg.classList.contains('error-message')) {
                    errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Este campo es obligatorio';
                    field.parentNode.insertBefore(errorMsg, field.nextSibling);
                }
                
                // Efecto de shake en el campo
                field.parentNode.classList.add('shake');
                setTimeout(() => {
                    field.parentNode.classList.remove('shake');
                }, 500);
            } else {
                field.classList.remove('error');
                // Eliminar mensaje de error si existe
                const errorMsg = field.nextElementSibling;
                if (errorMsg && errorMsg.classList.contains('error-message')) {
                    errorMsg.remove();
                }
            }
        });
        
        return isValid;
    }
    
    /**
     * Avanza al siguiente paso del formulario
     */
    function nextStep() {
        if (currentStep < steps.length - 1) {
            steps[currentStep].classList.remove('active');
            currentStep++;
            steps[currentStep].classList.add('active');
            
            // Actualizar indicadores
            updateStepIndicators();
            
            // Scroll a la parte superior del contenedor
            mobileForm.scrollIntoView({ behavior: 'smooth' });
            
            // Feedback táctil en móviles
            if ('vibrate' in navigator) {
                navigator.vibrate(30);
            }
        } else {
            // Último paso, enviar formulario
            submitForm();
        }
    }
    
    /**
     * Retrocede al paso anterior del formulario
     */
    function prevStep() {
        if (currentStep > 0) {
            steps[currentStep].classList.remove('active');
            currentStep--;
            steps[currentStep].classList.add('active');
            
            // Actualizar indicadores
            updateStepIndicators();
            
            // Scroll a la parte superior del contenedor
            mobileForm.scrollIntoView({ behavior: 'smooth' });
            
            // Feedback táctil en móviles
            if ('vibrate' in navigator) {
                navigator.vibrate(20);
            }
        }
    }
    
    /**
     * Actualiza los indicadores de paso
     */
    function updateStepIndicators() {
        const dots = stepDots.querySelectorAll('.step-dot');
        dots.forEach((dot, index) => {
            if (index === currentStep) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    /**
     * Envía el formulario con datos completos
     */
    function submitForm() {
        const form = mobileForm.closest('form');
        if (form) {
            // Mostrar indicador de carga
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn && submitBtn.classList.contains('btn-with-loader')) {
                submitBtn.classList.add('loading');
            }
            
            // Mostrar overlay de carga si existe
            const loadingOverlay = document.querySelector('.loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('active');
            }
            
            // Simulación de envío (reemplazar con el envío real)
            setTimeout(function() {
                form.submit();
            }, 1500);
        }
    }
}

/**
 * Inicializa los indicadores de carga
 */
function initLoadingIndicators() {
    // Botones con indicador de carga
    document.querySelectorAll('.btn-with-loader').forEach(button => {
        // Crear elementos de carga si no existen
        if (!button.querySelector('.btn-loader')) {
            // Guardar texto original
            const buttonText = button.textContent.trim();
            
            // Limpiar contenido
            button.innerHTML = '';
            
            // Añadir span para texto
            const textSpan = document.createElement('span');
            textSpan.className = 'btn-text';
            textSpan.textContent = buttonText;
            button.appendChild(textSpan);
            
            // Añadir loader
            const loader = document.createElement('div');
            loader.className = 'btn-loader';
            const spinner = document.createElement('div');
            spinner.className = 'btn-spinner';
            loader.appendChild(spinner);
            button.appendChild(loader);
        }
        
        // Añadir event listener para simular carga en formularios
        if (button.type === 'submit') {
            button.closest('form')?.addEventListener('submit', function(e) {
                // Prevenir envío real en caso de demostración
                // e.preventDefault();
                
                // Mostrar cargando
                button.classList.add('loading');
                
                // Simulación (eliminar en producción)
                setTimeout(() => {
                    button.classList.remove('loading');
                }, 2000);
            });
        }
    });
    
    // Crear overlay de carga global si no existe
    const reservasContainer = document.querySelector('.reservas-container');
    if (reservasContainer && !reservasContainer.querySelector('.loading-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        overlay.appendChild(spinner);
        
        const text = document.createElement('div');
        text.className = 'loading-text';
        text.textContent = 'Procesando...';
        overlay.appendChild(text);
        
        reservasContainer.style.position = 'relative';
        reservasContainer.appendChild(overlay);
    }
}

/**
 * Inicializa la actualización del resumen de reserva
 */
function initFormSummary() {
    // Actualizar el resumen cuando cambien los campos
    document.querySelectorAll('.mobile-step-form input, .mobile-step-form select, .mobile-step-form textarea').forEach(field => {
        field.addEventListener('change', function() {
            const fieldName = this.name;
            let fieldValue = this.value;
            
            // Formatear algunos valores para mejor presentación
            if (fieldName === 'comensales') {
                if (fieldValue === '1') {
                    fieldValue = '1 persona';
                } else if (fieldValue === 'mas') {
                    fieldValue = 'Más de 10 personas';
                } else {
                    fieldValue = `${fieldValue} personas`;
                }
            }
            
            updateReservationSummary(fieldName, fieldValue);
        });
    });
}

/**
 * Actualiza el resumen de la reserva con el valor dado
 */
function updateReservationSummary(fieldName, value) {
    const summaryElement = document.querySelector(`.summary-${fieldName}`);
    if (summaryElement) {
        summaryElement.textContent = value;
    }
}

/**
 * Carga las reservas para una fecha específica
 */
async function cargarReservasPorFecha(fecha) {
    try {
        const response = await fetch(RESERVAS_POR_FECHA_URL(fecha));
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.reservas) {
            return data.reservas;
        } else {
            console.warn("La respuesta no contiene reservas:", data);
            return [];
        }
    } catch (error) {
        console.error("Error al cargar reservas por fecha:", error);
        mostrarNotificacion("Error al cargar reservas", "error");
        return [];
    }
}

/**
 * Obtiene las horas disponibles para una fecha y número de personas
 */
async function obtenerHorasDisponibles(fecha, numPersonas) {
    try {
        const response = await fetch(HORAS_DISPONIBLES_URL(fecha, numPersonas));
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.horasDisponibles) {
            return data.horasDisponibles;
        } else {
            console.warn("La respuesta no contiene horas disponibles:", data);
            return [];
        }
    } catch (error) {
        console.error("Error al obtener horas disponibles:", error);
        return [];
    }
}

/**
 * Envía una reserva al servidor
 */
async function enviarReserva(datosReserva) {
    try {
        const response = await fetch(RESERVAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosReserva)
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return { success: true, reserva: data.reserva };
        } else {
            console.warn("La reserva no se completó:", data);
            return { success: false, error: data.error || "No se pudo completar la reserva" };
        }
    } catch (error) {
        console.error("Error al enviar reserva:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancela una reserva existente
 */
async function cancelarReserva(reservaId) {
    try {
        const response = await fetch(`${RESERVAS_URL}/${reservaId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return { success: true };
        } else {
            console.warn("La cancelación no se completó:", data);
            return { success: false, error: data.error || "No se pudo cancelar la reserva" };
        }
    } catch (error) {
        console.error("Error al cancelar reserva:", error);
        return { success: false, error: error.message };
    }
}

// Obtener reservas existentes
async function obtenerReservas(fecha, hora) {
    try {
        console.log(`Consultando reservas para ${fecha || 'todas las fechas'}${hora ? ' a las ' + hora : ''}`);
        
        let url = RESERVAS_URL;
        if (fecha) {
            url = RESERVAS_POR_FECHA_URL(fecha);
            if (hora) {
                url += `?hora=${hora}`;
            }
        }
        
        console.log("URL de consulta:", url);
        
        const respuesta = await fetch(url);
        
        if (!respuesta.ok) {
            throw new Error(`Error al consultar reservas: ${respuesta.status}`);
        }
        
        const datos = await respuesta.json();
        console.log("Reservas obtenidas:", datos);
        
        if (datos && datos.success && datos.reservas) {
            return datos.reservas;
        } else {
            console.warn("Formato de respuesta inesperado:", datos);
            return [];
        }
    } catch (error) {
        console.error("Error al obtener reservas:", error);
        mostrarNotificacion("Error al cargar reservas", "error");
        return [];
    }
}

// Obtener una reserva específica por ID
async function obtenerReservaPorId(id) {
    if (!id) {
        console.error("ID de reserva no proporcionado");
        return null;
    }
    
    try {
        console.log(`Consultando reserva con ID: ${id}`);
        const respuesta = await fetch(RESERVA_POR_ID_URL(id));
        
        if (!respuesta.ok) {
            throw new Error(`Error al consultar reserva: ${respuesta.status}`);
        }
        
        const datos = await respuesta.json();
        
        if (datos && datos.success && datos.reserva) {
            return datos.reserva;
        } else {
            console.warn("Formato de respuesta inesperado:", datos);
            return null;
        }
    } catch (error) {
        console.error(`Error al obtener reserva ${id}:`, error);
        mostrarNotificacion("Error al cargar datos de reserva", "error");
        return null;
    }
}
