/**
 * Gestión de menú para el panel de administración
 */

// Estado global
let categorias = [];
let platos = [];
let categoriaSeleccionada = null;
let platoSeleccionado = null;

// Elementos del DOM
let categoriasContainer;
let platosContainer;
let formCategoria;
let formPlato;
let categoriasList;
let platosList;

// Inicializar los componentes cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('menu-section')) {
        inicializarGestionMenu();
    }
});

// Función principal de inicialización
function inicializarGestionMenu() {
    // Obtener referencias a los elementos del DOM
    categoriasContainer = document.getElementById('categorias-container');
    platosContainer = document.getElementById('platos-container');
    formCategoria = document.getElementById('form-categoria');
    formPlato = document.getElementById('form-plato');
    categoriasList = document.getElementById('categorias-list');
    platosList = document.getElementById('platos-list');
    
    // Agregar eventos a los formularios
    formCategoria.addEventListener('submit', manejarSubmitCategoria);
    formPlato.addEventListener('submit', manejarSubmitPlato);
    
    // Configurar botones de acción
    document.getElementById('btn-nueva-categoria').addEventListener('click', () => {
        limpiarFormularioCategoria();
        mostrarFormularioCategoria();
    });
    
    document.getElementById('btn-nuevo-plato').addEventListener('click', () => {
        if (!categorias.length) {
            mostrarNotificacion('Primero debes crear al menos una categoría', 'error');
            return;
        }
        limpiarFormularioPlato();
        mostrarFormularioPlato();
    });
    
    // Cargar datos iniciales
    cargarCategorias();
}

// ==== GESTIÓN DE CATEGORÍAS ====

// Cargar todas las categorías
async function cargarCategorias() {
    try {
        mostrarCargando(categoriasList);
        
        const response = await fetch('/api/menu/categorias');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al cargar las categorías');
        }
        
        categorias = data.categorias || [];
        renderizarCategorias();
        
        // Si hay categorías, cargar los platos de la primera
        if (categorias.length > 0) {
            seleccionarCategoria(categorias[0].id);
        } else {
            ocultarCargando(categoriasList);
            mostrarEstadoVacio(categoriasList, 'No hay categorías creadas', 'fas fa-folder-open');
        }
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        ocultarCargando(categoriasList);
        mostrarEstadoVacio(categoriasList, 'Error al cargar las categorías', 'fas fa-exclamation-triangle');
        mostrarNotificacion('Error al cargar las categorías: ' + error.message, 'error');
    }
}

// Renderizar lista de categorías
function renderizarCategorias() {
    ocultarCargando(categoriasList);
    
    if (!categorias.length) {
        mostrarEstadoVacio(categoriasList, 'No hay categorías creadas', 'fas fa-folder-open');
        return;
    }
    
    categoriasList.innerHTML = '';
    
    categorias.forEach(categoria => {
        const categoriaElement = document.createElement('div');
        categoriaElement.className = `categoria-item ${categoriaSeleccionada === categoria.id ? 'active' : ''}`;
        categoriaElement.innerHTML = `
            <div class="categoria-info">
                <h3>${categoria.nombre}</h3>
                <p>${categoria.descripcion || 'Sin descripción'}</p>
            </div>
            <div class="categoria-status">
                <span class="badge ${categoria.activa ? 'badge-success' : 'badge-inactive'}">
                    ${categoria.activa ? 'Activa' : 'Inactiva'}
                </span>
            </div>
            <div class="categoria-actions">
                <button class="btn-icon btn-edit" title="Editar categoría">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" title="Eliminar categoría">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Agregar eventos a los botones
        categoriaElement.querySelector('.categoria-info').addEventListener('click', () => {
            seleccionarCategoria(categoria.id);
        });
        
        categoriaElement.querySelector('.btn-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            editarCategoria(categoria);
        });
        
        categoriaElement.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            confirmarEliminarCategoria(categoria);
        });
        
        categoriasList.appendChild(categoriaElement);
    });
}

// Seleccionar una categoría y cargar sus platos
function seleccionarCategoria(categoriaId) {
    categoriaSeleccionada = categoriaId;
    renderizarCategorias();
    cargarPlatos(categoriaId);
    
    // Actualizar estado de los botones
    document.querySelectorAll('.categoria-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const categoriaSeleccionadaElement = Array.from(document.querySelectorAll('.categoria-item')).find(
        item => item.querySelector('h3').textContent === categorias.find(c => c.id === categoriaId).nombre
    );
    
    if (categoriaSeleccionadaElement) {
        categoriaSeleccionadaElement.classList.add('active');
    }
}

// Mostrar formulario para crear/editar categoría
function mostrarFormularioCategoria() {
    document.getElementById('categoria-form-container').style.display = 'block';
}

// Ocultar formulario de categoría
function ocultarFormularioCategoria() {
    document.getElementById('categoria-form-container').style.display = 'none';
}

// Limpiar formulario de categoría
function limpiarFormularioCategoria() {
    formCategoria.reset();
    formCategoria.dataset.mode = 'create';
    formCategoria.dataset.id = '';
    document.getElementById('titulo-form-categoria').textContent = 'Nueva Categoría';
}

// Editar una categoría existente
function editarCategoria(categoria) {
    formCategoria.dataset.mode = 'edit';
    formCategoria.dataset.id = categoria.id;
    document.getElementById('titulo-form-categoria').textContent = 'Editar Categoría';
    
    document.getElementById('categoria-nombre').value = categoria.nombre;
    document.getElementById('categoria-descripcion').value = categoria.descripcion || '';
    document.getElementById('categoria-orden').value = categoria.orden || 0;
    document.getElementById('categoria-activa').checked = categoria.activa !== false;
    
    mostrarFormularioCategoria();
}

// Manejar envío del formulario de categoría
async function manejarSubmitCategoria(e) {
    e.preventDefault();
    
    const modo = formCategoria.dataset.mode;
    const categoriaId = formCategoria.dataset.id;
    
    const datosCategoria = {
        nombre: document.getElementById('categoria-nombre').value.trim(),
        descripcion: document.getElementById('categoria-descripcion').value.trim(),
        orden: parseInt(document.getElementById('categoria-orden').value) || 0,
        activa: document.getElementById('categoria-activa').checked
    };
    
    // Validar datos
    if (!datosCategoria.nombre) {
        mostrarNotificacion('El nombre de la categoría es obligatorio', 'error');
        return;
    }
    
    try {
        let url = '/api/admin/menu/categorias';
        let method = 'POST';
        
        if (modo === 'edit' && categoriaId) {
            url = `/api/admin/menu/categorias/${categoriaId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(datosCategoria)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.details || 'Error al procesar la categoría');
        }
        
        // Actualizar la lista de categorías
        await cargarCategorias();
        ocultarFormularioCategoria();
        
        mostrarNotificacion(
            modo === 'edit' ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente', 
            'success'
        );
    } catch (error) {
        console.error('Error al guardar categoría:', error);
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

// Confirmar eliminación de categoría
function confirmarEliminarCategoria(categoria) {
    if (confirm(`¿Estás seguro de que deseas eliminar la categoría "${categoria.nombre}"? Esta acción no se puede deshacer.`)) {
        eliminarCategoria(categoria.id);
    }
}

// Eliminar una categoría
async function eliminarCategoria(categoriaId) {
    try {
        const response = await fetch(`/api/admin/menu/categorias/${categoriaId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.details || 'Error al eliminar la categoría');
        }
        
        // Actualizar la lista de categorías
        await cargarCategorias();
        
        mostrarNotificacion('Categoría eliminada correctamente', 'success');
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

// ==== GESTIÓN DE PLATOS ====

// Cargar platos de una categoría
async function cargarPlatos(categoriaId) {
    try {
        mostrarCargando(platosList);
        
        const response = await fetch(`/api/menu/platos?categoriaId=${categoriaId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al cargar los platos');
        }
        
        platos = data.platos || [];
        renderizarPlatos();
    } catch (error) {
        console.error('Error al cargar platos:', error);
        ocultarCargando(platosList);
        mostrarEstadoVacio(platosList, 'Error al cargar los platos', 'fas fa-exclamation-triangle');
        mostrarNotificacion('Error al cargar los platos: ' + error.message, 'error');
    }
}

// Renderizar lista de platos
function renderizarPlatos() {
    ocultarCargando(platosList);
    
    if (!platos.length) {
        mostrarEstadoVacio(platosList, 'No hay platos en esta categoría', 'fas fa-utensils');
        return;
    }
    
    platosList.innerHTML = '';
    
    platos.forEach(plato => {
        const platoElement = document.createElement('div');
        platoElement.className = 'plato-item';
        platoElement.innerHTML = `
            <div class="plato-info">
                <h3>${plato.nombre}</h3>
                <p>${plato.descripcion || 'Sin descripción'}</p>
                <div class="plato-meta">
                    <span class="plato-precio">${plato.precio}€</span>
                    ${plato.destacado ? '<span class="badge badge-highlight"><i class="fas fa-star"></i> Destacado</span>' : ''}
                </div>
            </div>
            <div class="plato-status">
                <span class="badge ${plato.disponible ? 'badge-success' : 'badge-inactive'}">
                    ${plato.disponible ? 'Disponible' : 'No disponible'}
                </span>
            </div>
            <div class="plato-actions">
                <button class="btn-icon btn-edit" title="Editar plato">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" title="Eliminar plato">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Agregar eventos a los botones
        platoElement.querySelector('.btn-edit').addEventListener('click', () => {
            editarPlato(plato);
        });
        
        platoElement.querySelector('.btn-delete').addEventListener('click', () => {
            confirmarEliminarPlato(plato);
        });
        
        platosList.appendChild(platoElement);
    });
}

// Mostrar formulario para crear/editar plato
function mostrarFormularioPlato() {
    document.getElementById('plato-form-container').style.display = 'block';
    
    // Actualizar opciones de categorías en el select
    const selectCategoria = document.getElementById('plato-categoria');
    selectCategoria.innerHTML = '';
    
    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nombre;
        selectCategoria.appendChild(option);
    });
    
    // Seleccionar la categoría actual si existe
    if (categoriaSeleccionada) {
        selectCategoria.value = categoriaSeleccionada;
    }
}

// Ocultar formulario de plato
function ocultarFormularioPlato() {
    document.getElementById('plato-form-container').style.display = 'none';
}

// Limpiar formulario de plato
function limpiarFormularioPlato() {
    formPlato.reset();
    formPlato.dataset.mode = 'create';
    formPlato.dataset.id = '';
    document.getElementById('titulo-form-plato').textContent = 'Nuevo Plato';
    
    // Limpiar campos dinámicos
    document.getElementById('ingredientes-container').innerHTML = '';
    document.getElementById('alergenos-container').innerHTML = '';
    
    // Añadir campo para ingrediente
    agregarCampoIngrediente();
}

// Editar un plato existente
function editarPlato(plato) {
    formPlato.dataset.mode = 'edit';
    formPlato.dataset.id = plato.id;
    document.getElementById('titulo-form-plato').textContent = 'Editar Plato';
    
    document.getElementById('plato-nombre').value = plato.nombre;
    document.getElementById('plato-descripcion').value = plato.descripcion || '';
    document.getElementById('plato-precio').value = plato.precio;
    document.getElementById('plato-categoria').value = plato.categoriaId;
    document.getElementById('plato-imagen').value = plato.imagen || '';
    document.getElementById('plato-disponible').checked = plato.disponible !== false;
    document.getElementById('plato-destacado').checked = plato.destacado || false;
    
    // Limpiar y repoblar ingredientes
    document.getElementById('ingredientes-container').innerHTML = '';
    if (plato.ingredientes && plato.ingredientes.length > 0) {
        plato.ingredientes.forEach(ingrediente => {
            agregarCampoIngrediente(ingrediente);
        });
    } else {
        agregarCampoIngrediente();
    }
    
    // Limpiar y repoblar alérgenos
    document.getElementById('alergenos-container').innerHTML = '';
    if (plato.alergenos && plato.alergenos.length > 0) {
        plato.alergenos.forEach(alergeno => {
            agregarCampoAlergeno(alergeno);
        });
    } else {
        agregarCampoAlergeno();
    }
    
    mostrarFormularioPlato();
}

// Agregar campo para ingrediente
function agregarCampoIngrediente(valor = '') {
    const container = document.getElementById('ingredientes-container');
    const index = container.children.length;
    
    const ingredienteRow = document.createElement('div');
    ingredienteRow.className = 'input-group';
    ingredienteRow.innerHTML = `
        <input type="text" id="ingrediente-${index}" name="ingredientes[]" value="${valor}" placeholder="Ingrediente" class="form-control">
        <button type="button" class="btn-icon btn-remove" title="Eliminar ingrediente">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Evento para eliminar el ingrediente
    ingredienteRow.querySelector('.btn-remove').addEventListener('click', () => {
        container.removeChild(ingredienteRow);
    });
    
    container.appendChild(ingredienteRow);
}

// Agregar campo para alérgeno
function agregarCampoAlergeno(valor = '') {
    const container = document.getElementById('alergenos-container');
    const index = container.children.length;
    
    const alergenoRow = document.createElement('div');
    alergenoRow.className = 'input-group';
    alergenoRow.innerHTML = `
        <input type="text" id="alergeno-${index}" name="alergenos[]" value="${valor}" placeholder="Alérgeno" class="form-control">
        <button type="button" class="btn-icon btn-remove" title="Eliminar alérgeno">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Evento para eliminar el alérgeno
    alergenoRow.querySelector('.btn-remove').addEventListener('click', () => {
        container.removeChild(alergenoRow);
    });
    
    container.appendChild(alergenoRow);
}

// Manejar envío del formulario de plato
async function manejarSubmitPlato(e) {
    e.preventDefault();
    
    const modo = formPlato.dataset.mode;
    const platoId = formPlato.dataset.id;
    
    // Recoger ingredientes
    const ingredientes = Array.from(document.querySelectorAll('input[name="ingredientes[]"]'))
        .map(input => input.value.trim())
        .filter(valor => valor !== '');
    
    // Recoger alérgenos
    const alergenos = Array.from(document.querySelectorAll('input[name="alergenos[]"]'))
        .map(input => input.value.trim())
        .filter(valor => valor !== '');
    
    const datosPlato = {
        nombre: document.getElementById('plato-nombre').value.trim(),
        descripcion: document.getElementById('plato-descripcion').value.trim(),
        precio: parseFloat(document.getElementById('plato-precio').value) || 0,
        categoriaId: document.getElementById('plato-categoria').value,
        imagen: document.getElementById('plato-imagen').value.trim(),
        disponible: document.getElementById('plato-disponible').checked,
        destacado: document.getElementById('plato-destacado').checked,
        ingredientes,
        alergenos
    };
    
    // Validar datos
    if (!datosPlato.nombre) {
        mostrarNotificacion('El nombre del plato es obligatorio', 'error');
        return;
    }
    
    if (datosPlato.precio <= 0) {
        mostrarNotificacion('El precio debe ser mayor que cero', 'error');
        return;
    }
    
    if (!datosPlato.categoriaId) {
        mostrarNotificacion('Debes seleccionar una categoría', 'error');
        return;
    }
    
    try {
        let url = '/api/admin/menu/platos';
        let method = 'POST';
        
        if (modo === 'edit' && platoId) {
            url = `/api/admin/menu/platos/${platoId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(datosPlato)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.details || 'Error al procesar el plato');
        }
        
        // Actualizar la lista de platos
        await cargarPlatos(categoriaSeleccionada);
        ocultarFormularioPlato();
        
        mostrarNotificacion(
            modo === 'edit' ? 'Plato actualizado correctamente' : 'Plato creado correctamente', 
            'success'
        );
    } catch (error) {
        console.error('Error al guardar plato:', error);
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

// Confirmar eliminación de plato
function confirmarEliminarPlato(plato) {
    if (confirm(`¿Estás seguro de que deseas eliminar el plato "${plato.nombre}"? Esta acción no se puede deshacer.`)) {
        eliminarPlato(plato.id);
    }
}

// Eliminar un plato
async function eliminarPlato(platoId) {
    try {
        const response = await fetch(`/api/admin/menu/platos/${platoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.details || 'Error al eliminar el plato');
        }
        
        // Actualizar la lista de platos
        await cargarPlatos(categoriaSeleccionada);
        
        mostrarNotificacion('Plato eliminado correctamente', 'success');
    } catch (error) {
        console.error('Error al eliminar plato:', error);
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

// ==== FUNCIONES AUXILIARES ====

// Mostrar indicador de carga
function mostrarCargando(container) {
    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando...</p>
        </div>
    `;
}

// Ocultar indicador de carga
function ocultarCargando(container) {
    const loadingElement = container.querySelector('.loading-state');
    if (loadingElement) {
        container.removeChild(loadingElement);
    }
}

// Mostrar estado vacío o error
function mostrarEstadoVacio(container, mensaje, iconoClase) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="${iconoClase}"></i>
            <p>${mensaje}</p>
        </div>
    `;
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo) {
    const notificacionElement = document.createElement('div');
    notificacionElement.className = `notificacion notificacion-${tipo}`;
    notificacionElement.innerHTML = `
        <span>${mensaje}</span>
        <button class="btn-cerrar"><i class="fas fa-times"></i></button>
    `;
    
    // Cerrar notificación al hacer clic en el botón
    notificacionElement.querySelector('.btn-cerrar').addEventListener('click', () => {
        document.body.removeChild(notificacionElement);
    });
    
    document.body.appendChild(notificacionElement);
    
    // Eliminar automáticamente después de 5 segundos
    setTimeout(() => {
        if (document.body.contains(notificacionElement)) {
            document.body.removeChild(notificacionElement);
        }
    }, 5000);
}

// Obtener token de autenticación
function getAuthToken() {
    return localStorage.getItem('authToken');
} 