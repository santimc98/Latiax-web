/**
 * Funcionalidades del panel de administración
 */

// Variables globales
let currentUser = null;
let reservasInterval = null; // Intervalo para actualizar reservas

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    verificarSesion();
    
    // Configurar navegación
    configurarNavegacion();
    
    // Configurar botón de logout
    document.getElementById('logout-btn').addEventListener('click', cerrarSesion);
});

// Verificar si el usuario está autenticado
async function verificarSesion() {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        // Redirigir al login si no hay token
        window.location.href = 'admin-login.html';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/session', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.authenticated) {
            throw new Error('Sesión inválida');
        }
        
        // Guardar datos del usuario
        currentUser = {
            uid: data.uid,
            email: data.email,
            nombre: data.nombre
        };
        
        // Actualizar UI con datos del usuario
        document.getElementById('user-name').textContent = currentUser.nombre || 'Administrador';
        document.getElementById('user-email').textContent = currentUser.email;
        
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        
        // Detener cualquier actualización automática antes de redirigir
        if (reservasInterval) {
            clearInterval(reservasInterval);
            reservasInterval = null;
        }
        
        // Redirigir al login si hay error
        localStorage.removeItem('authToken');
        window.location.href = 'admin-login.html';
    }
}

// Cerrar sesión del usuario
async function cerrarSesion() {
    try {
        // Detener cualquier intervalo de actualización
        if (reservasInterval) {
            clearInterval(reservasInterval);
            reservasInterval = null;
        }
        
        const token = localStorage.getItem('authToken');
        
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        
        // Eliminar token y redirigir al login
        localStorage.removeItem('authToken');
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        
        // En caso de error, forzar logout de todas formas
        localStorage.removeItem('authToken');
        window.location.href = 'admin-login.html';
    }
}

// Configurar navegación entre secciones
function configurarNavegacion() {
    const navLinks = document.querySelectorAll('.admin-nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover clase active de todos los links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Agregar clase active al link clickeado
            link.classList.add('active');
            
            // Mostrar sección correspondiente
            const sectionId = link.getAttribute('data-section');
            mostrarSeccion(sectionId);
        });
    });
}

// Mostrar sección específica y ocultar las demás
function mostrarSeccion(sectionId) {
    // Detener actualización automática de reservas si cambiamos a otra sección
    if (sectionId !== 'reservas' && reservasInterval) {
        clearInterval(reservasInterval);
        reservasInterval = null;
    }
    
    // Iniciar actualización automática si vamos a la sección de reservas
    if (sectionId === 'reservas' && !reservasInterval) {
        cargarReservas(); // Cargar inmediatamente
        // Actualizar cada 30 segundos (tiempo razonable)
        reservasInterval = setInterval(cargarReservas, 30000);
    }
    
    // Ocultar todas las secciones
    document.querySelectorAll('main.admin-content > section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar la sección solicitada
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

// Cargar reservas desde la API
async function cargarReservas() {
    const fechaFiltro = document.getElementById('fecha-filtro')?.value || '';
    const horaFiltro = document.getElementById('hora-filtro')?.value || '';
    const estadoFiltro = document.getElementById('estado-filtro')?.value || '';
    
    try {
        // Construir URL con parámetros de filtro
        let url = '/api/admin/reservas';
        const params = new URLSearchParams();
        
        if (fechaFiltro) params.append('fecha', fechaFiltro);
        if (horaFiltro) params.append('hora', horaFiltro);
        if (estadoFiltro) params.append('estado', estadoFiltro);
        
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        // Si hay error de autenticación, detener las actualizaciones
        if (response.status === 401 || response.status === 403) {
            if (reservasInterval) {
                clearInterval(reservasInterval);
                reservasInterval = null;
            }
            throw new Error('Error de autenticación');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al cargar reservas');
        }
        
        // Renderizar reservas (función que debe implementarse según la UI)
        renderizarReservas(data.reservas || []);
        
    } catch (error) {
        console.error('Error al cargar reservas:', error);
        
        // Si hay error de autenticación, redirigir al login
        if (error.message === 'Error de autenticación') {
            localStorage.removeItem('authToken');
            window.location.href = 'admin-login.html';
        }
        
        // Mostrar mensaje de error en la UI
        mostrarErrorReservas('Error al cargar las reservas. Intenta de nuevo más tarde.');
    }
}

// Función para renderizar reservas (implementación básica, debe adaptarse)
function renderizarReservas(reservas) {
    const container = document.querySelector('.reservas-table tbody');
    if (!container) return;
    
    if (reservas.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No hay reservas que coincidan con los filtros seleccionados</p>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = reservas.map(reserva => `
        <tr>
            <td>${reserva.fecha}</td>
            <td>${reserva.hora}</td>
            <td>${reserva.nombre}</td>
            <td>${reserva.personas} personas</td>
            <td>
                <span class="status-badge status-${reserva.estado}">
                    ${reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
                </span>
            </td>
            <td class="reserva-actions">
                <button class="action-btn action-btn-view" data-id="${reserva.id}">
                    <i class="fas fa-eye"></i> Ver
                </button>
                <button class="action-btn action-btn-edit" data-id="${reserva.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-btn action-btn-cancel" data-id="${reserva.id}">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </td>
        </tr>
    `).join('');
    
    // Añadir eventos a los botones
    document.querySelectorAll('.action-btn-view').forEach(btn => {
        btn.addEventListener('click', () => verReserva(btn.dataset.id));
    });
    
    document.querySelectorAll('.action-btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editarReserva(btn.dataset.id));
    });
    
    document.querySelectorAll('.action-btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => cancelarReserva(btn.dataset.id));
    });
}

// Mostrar error en la sección de reservas
function mostrarErrorReservas(mensaje) {
    const container = document.querySelector('.reservas-table tbody');
    if (!container) return;
    
    container.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${mensaje}</p>
            </td>
        </tr>
    `;
}

// Placeholder para funciones de gestión de reservas
function verReserva(id) {
    console.log('Ver reserva:', id);
    // Implementar según necesidades
}

function editarReserva(id) {
    console.log('Editar reserva:', id);
    // Implementar según necesidades
}

function cancelarReserva(id) {
    console.log('Cancelar reserva:', id);
    
    if (confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
        // Implementar llamada a la API para cancelar
        fetch(`/api/admin/reservas/${id}/cancelar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Error al cancelar la reserva');
            return response.json();
        })
        .then(data => {
            // Recargar reservas tras cancelación exitosa
            cargarReservas();
        })
        .catch(error => {
            console.error('Error al cancelar reserva:', error);
            alert('No se pudo cancelar la reserva. Intenta de nuevo.');
        });
    }
} 