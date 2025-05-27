// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar el loader
    const loaderContainer = document.querySelector('.loader-container');
    
    // Ocultar el loader después de 1.5 segundos
    setTimeout(() => {
        loaderContainer.classList.add('hidden');
    }, 1500);
    
    // Referencias DOM
    const header = document.querySelector('.header');
    const backToTopButton = document.querySelector('.back-to-top');
    const menuButton = document.querySelector('.menu-button');
    const sidebar = document.getElementById('mySidebar');
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const animatedFromLeft = document.querySelectorAll('.animate-from-left');
    const animatedFromRight = document.querySelectorAll('.animate-from-right');
    const testimonialDots = document.querySelectorAll('.testimonial-dot');
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const sections = document.querySelectorAll('section[id]');
    const contactForm = document.getElementById('contactForm');
    
    // Funcionalidad de pestañas para la página de Modelos Predictivos
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remover la clase activa de todos los botones y paneles
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Agregar la clase activa al botón clickeado
                button.classList.add('active');
                
                // Mostrar el panel correspondiente
                const tabId = button.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }
    
    // Función para abrir el menú lateral
    window.openNav = function() {
        sidebar.style.width = "250px";
    };
    
    // Función para cerrar el menú lateral
    window.closeNav = function() {
        sidebar.style.width = "0";
    };
    
    // Event listeners para los enlaces del menú lateral
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeNav();
        });
    });
    
    // Cambiar estilo del header al hacer scroll
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
            
            if (backToTopButton) {
                backToTopButton.classList.add('show');
            }
        } else {
            header.classList.remove('scrolled');
            
            if (backToTopButton) {
                backToTopButton.classList.remove('show');
            }
        }
        
        // Animar elementos al hacer scroll
        animatedElements.forEach(el => {
            const elementTop = el.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight * 0.8) {
                el.classList.add('show');
            }
        });
        
        // Animar elementos desde la izquierda
        animatedFromLeft.forEach(el => {
            const elementTop = el.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight * 0.8) {
                el.classList.add('show');
            }
        });
        
        // Animar elementos desde la derecha
        animatedFromRight.forEach(el => {
            const elementTop = el.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight * 0.8) {
                el.classList.add('show');
            }
        });
    });
    
    // Botón para volver arriba
    if (backToTopButton) {
        backToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Función para cambiar testimonios
    function changeTestimonial(index) {
        testimonialCards.forEach(card => card.classList.remove('active'));
        testimonialDots.forEach(dot => dot.classList.remove('active'));
        
        testimonialCards[index].classList.add('active');
        testimonialDots[index].classList.add('active');
    }
    
    // Event listeners para los puntos de testimonios
    if (testimonialDots.length > 0) {
        testimonialDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                changeTestimonial(index);
            });
        });
        
        // Activar el primer testimonio por defecto
        changeTestimonial(0);
        
        // Cambiar testimonios automáticamente cada 5 segundos
        let currentTestimonial = 0;
        setInterval(() => {
            currentTestimonial = (currentTestimonial + 1) % testimonialCards.length;
            changeTestimonial(currentTestimonial);
        }, 5000);
    }
    
    // Validación del formulario de contacto
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            // Validar campos
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const messageInput = document.getElementById('message');
            let isValid = true;
            
            if (!nameInput.value.trim()) {
                showError(nameInput, 'Por favor, ingresa tu nombre');
                isValid = false;
                e.preventDefault();
            } else {
                clearError(nameInput);
            }
            
            if (!emailInput.value.trim()) {
                showError(emailInput, 'Por favor, ingresa tu correo electrónico');
                isValid = false;
                e.preventDefault();
            } else if (!isValidEmail(emailInput.value)) {
                showError(emailInput, 'Por favor, ingresa un correo electrónico válido');
                isValid = false;
                e.preventDefault();
            } else {
                clearError(emailInput);
            }
            
            if (!messageInput.value.trim()) {
                showError(messageInput, 'Por favor, ingresa tu mensaje');
                isValid = false;
                e.preventDefault();
            } else {
                clearError(messageInput);
            }
            
            // Si el formulario es válido, se enviará automáticamente a través de Formsubmit
            // No necesitamos hacer nada más aquí
        });
    }
    
    // Función para validar email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Funciones para mostrar/ocultar errores
    function showError(input, message) {
        const formGroup = input.parentElement;
        const errorElement = formGroup.querySelector('.error-message');
        
        if (!errorElement) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerText = message;
            errorDiv.style.color = 'var(--primary-red)';
            errorDiv.style.fontSize = '14px';
            errorDiv.style.marginTop = '5px';
            formGroup.appendChild(errorDiv);
        } else {
            errorElement.innerText = message;
        }
        
        input.style.borderColor = 'var(--primary-red)';
    }
    
    function clearError(input) {
        const formGroup = input.parentElement;
        const errorElement = formGroup.querySelector('.error-message');
        
        if (errorElement) {
            errorElement.remove();
        }
        
        input.style.borderColor = '#ddd';
    }
});

// Detectar cuando las imágenes terminan de cargar
window.addEventListener('load', function() {
    const loaderContainer = document.querySelector('.loader-container');
    if (loaderContainer && !loaderContainer.classList.contains('hidden')) {
        loaderContainer.classList.add('hidden');
    }
    
    // También animamos elementos visibles al cargar por primera vez
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight * 0.85) {
            el.classList.add('show');
        }
    });
    
    // Animar elementos desde la izquierda al cargar
    const animatedFromLeft = document.querySelectorAll('.animate-from-left');
    animatedFromLeft.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight * 0.85) {
            el.classList.add('show');
        }
    });
    
    // Animar elementos desde la derecha al cargar
    const animatedFromRight = document.querySelectorAll('.animate-from-right');
    animatedFromRight.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight * 0.85) {
            el.classList.add('show');
        }
    });
}); 