/**
 * LATIAX Restaurant Assistant
 * Sistema de carga optimizada de assets
 */

// Configuración global
const config = {
    imagesPath: 'img/',
    cssPath: 'css/',
    jsPath: 'js/',
    lazyLoadThreshold: 200, // píxeles antes de entrar en viewport
    preloadCritical: true
};

/**
 * Gestiona la carga optimizada de recursos
 */
class AssetLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.loadedStyles = new Set();
        this.observers = {};
        this.initializeLazyLoading();
    }

    /**
     * Inicializa la carga diferida de imágenes y otros recursos
     */
    initializeLazyLoading() {
        // Comprobar soporte del navegador para Intersection Observer
        if ('IntersectionObserver' in window) {
            // Observer para imágenes con data-src
            this.observers.images = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        this.loadImage(img);
                        this.observers.images.unobserve(img);
                    }
                });
            }, {
                rootMargin: `${config.lazyLoadThreshold}px 0px`
            });

            // Observar todas las imágenes con data-src
            document.querySelectorAll('img[data-src]').forEach(img => {
                this.observers.images.observe(img);
            });

            // Cargar fondos diferidos
            this.observers.backgrounds = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const src = element.getAttribute('data-background');
                        if (src) {
                            element.style.backgroundImage = `url(${src})`;
                            element.removeAttribute('data-background');
                            this.observers.backgrounds.unobserve(element);
                        }
                    }
                });
            }, {
                rootMargin: `${config.lazyLoadThreshold}px 0px`
            });

            // Observar elementos con fondos diferidos
            document.querySelectorAll('[data-background]').forEach(element => {
                this.observers.backgrounds.observe(element);
            });
        } else {
            // Fallback para navegadores sin soporte
            this.loadAllLazyResources();
        }

        // Cargar recursos críticos inmediatamente si está configurado
        if (config.preloadCritical) {
            this.preloadCriticalResources();
        }
    }

    /**
     * Carga una imagen desde atributo data-src
     */
    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            
            // Si tiene data-srcset, cargarlo también
            if (img.getAttribute('data-srcset')) {
                img.srcset = img.getAttribute('data-srcset');
                img.removeAttribute('data-srcset');
            }
            
            // Asegurar que la imagen está completa antes de quitar clase
            img.onload = () => {
                img.classList.remove('lazy-image');
                img.classList.add('loaded');
            };
        }
    }

    /**
     * Fallback para cargar todos los recursos diferidos de una vez
     */
    loadAllLazyResources() {
        // Cargar todas las imágenes
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.loadImage(img);
        });

        // Cargar todos los fondos
        document.querySelectorAll('[data-background]').forEach(element => {
            const src = element.getAttribute('data-background');
            if (src) {
                element.style.backgroundImage = `url(${src})`;
                element.removeAttribute('data-background');
            }
        });
    }

    /**
     * Carga script de forma asíncrona
     */
    loadScript(url, async = true, defer = false) {
        return new Promise((resolve, reject) => {
            // Verificar si ya está cargado
            if (this.loadedScripts.has(url)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url.startsWith('http') ? url : `${config.jsPath}${url}`;
            script.async = async;
            script.defer = defer;

            script.onload = () => {
                this.loadedScripts.add(url);
                resolve();
            };

            script.onerror = () => {
                reject(new Error(`Error cargando script: ${url}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Carga archivo CSS de forma asíncrona
     */
    loadStyle(url) {
        return new Promise((resolve, reject) => {
            // Verificar si ya está cargado
            if (this.loadedStyles.has(url)) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url.startsWith('http') ? url : `${config.cssPath}${url}`;

            link.onload = () => {
                this.loadedStyles.add(url);
                resolve();
            };

            link.onerror = () => {
                reject(new Error(`Error cargando estilo: ${url}`));
            };

            document.head.appendChild(link);
        });
    }

    /**
     * Precarga recursos críticos para mejorar rendimiento
     */
    preloadCriticalResources() {
        // Precargar logo
        const logoPreload = document.createElement('link');
        logoPreload.rel = 'preload';
        logoPreload.as = 'image';
        logoPreload.href = `${config.imagesPath}logo.png`;
        document.head.appendChild(logoPreload);

        // Precargar íconos críticos para UI
        const criticalFonts = document.createElement('link');
        criticalFonts.rel = 'preload';
        criticalFonts.as = 'font';
        criticalFonts.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap';
        criticalFonts.crossOrigin = 'anonymous';
        document.head.appendChild(criticalFonts);
    }

    /**
     * Carga dinámica de módulos basados en la página actual
     */
    loadPageModules(pageName) {
        // Mapeo de módulos por página
        const pageModules = {
            'index': ['chat.js'],
            'reservas': ['reservas.js', 'calendar.js'],
            'menu': ['menu.js'],
            'contacto': ['contact-form.js']
        };

        // Obtener módulos de la página actual
        const modules = pageModules[pageName] || [];
        
        // Cargar cada módulo
        const promises = modules.map(module => this.loadScript(module));
        
        // Siempre cargar el asistente de voz
        promises.push(this.loadScript('voice-assistant.js', true, true));
        
        return Promise.all(promises);
    }
}

// Inicializar globalmente
window.assetLoader = new AssetLoader();

// Detectar página actual y cargar módulos correspondientes
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = document.body.getAttribute('data-page') || 
                       window.location.pathname.split('/').pop().replace('.html', '') ||
                       'index';
    
    window.assetLoader.loadPageModules(currentPage);
    
    // Inicializar elementos con data-lazy-src después de cargar la página
    document.querySelectorAll('[data-lazy-src]').forEach(element => {
        window.assetLoader.observers.images.observe(element);
    });
}); 