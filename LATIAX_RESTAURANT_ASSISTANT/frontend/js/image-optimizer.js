/**
 * LATIAX Restaurant Assistant
 * Optimizador de imágenes en cliente
 */

class ImageOptimizer {
    constructor() {
        this.settings = {
            jpegQuality: 0.85,
            pngQuality: 0.85,
            webpQuality: 0.90,
            maxWidth: 1200,
            convertToWebP: true,
            resizeIfLarger: true
        };
        
        // Verificar soporte para formatos modernos
        this.hasWebP = false;
        this.checkWebPSupport();
        
        // Inicializar carga de imágenes optimizadas
        this.initializeImages();
    }
    
    /**
     * Comprueba si el navegador soporta WebP
     */
    checkWebPSupport() {
        const testWebP = (callback) => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                callback(webP.height === 2);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        };
        
        testWebP((support) => {
            this.hasWebP = support;
            if (support) {
                document.documentElement.classList.add('webp');
            } else {
                document.documentElement.classList.add('no-webp');
            }
        });
    }
    
    /**
     * Inicializa imágenes con src-set adecuado según el dispositivo
     */
    initializeImages() {
        // Buscar todas las imágenes con atributos de optimización
        document.querySelectorAll('img[data-src-responsive]').forEach(img => {
            this.setupResponsiveImage(img);
        });
        
        // Manejar elementos con fondos responsive
        document.querySelectorAll('[data-bg-responsive]').forEach(element => {
            this.setupResponsiveBackground(element);
        });
    }
    
    /**
     * Configura una imagen responsive basada en el tamaño de pantalla
     */
    setupResponsiveImage(img) {
        // Obtener datos de breakpoints
        const dataSources = JSON.parse(img.getAttribute('data-src-responsive'));
        
        // Determinar qué versión cargar basado en ancho de pantalla
        const selectedSource = this.getSourceForScreenWidth(dataSources);
        
        // Usar versión WebP si está disponible y soportada
        if (this.hasWebP && selectedSource.webp) {
            img.setAttribute('data-src', selectedSource.webp);
        } else {
            img.setAttribute('data-src', selectedSource.src);
        }
        
        // Si hay srcset, configurarlo también
        if (selectedSource.srcset) {
            const srcsetValue = this.hasWebP && selectedSource.webpSrcset 
                ? selectedSource.webpSrcset 
                : selectedSource.srcset;
            
            img.setAttribute('data-srcset', srcsetValue);
        }
        
        // Marcar para lazy loading
        img.classList.add('lazy-image');
    }
    
    /**
     * Configura un fondo responsive basado en el tamaño de pantalla
     */
    setupResponsiveBackground(element) {
        // Obtener datos de breakpoints
        const dataSources = JSON.parse(element.getAttribute('data-bg-responsive'));
        
        // Determinar qué versión cargar basado en ancho de pantalla
        const selectedSource = this.getSourceForScreenWidth(dataSources);
        
        // Usar versión WebP si está disponible y soportada
        if (this.hasWebP && selectedSource.webp) {
            element.setAttribute('data-background', selectedSource.webp);
        } else {
            element.setAttribute('data-background', selectedSource.src);
        }
        
        // Marcar para lazy loading
        element.classList.add('lazy-background');
    }
    
    /**
     * Determina qué fuente usar según el ancho de pantalla
     */
    getSourceForScreenWidth(sources) {
        const screenWidth = window.innerWidth;
        let selectedSource = sources.default;
        
        // Ordenar breakpoints de mayor a menor
        const breakpoints = Object.keys(sources)
            .filter(key => key !== 'default')
            .map(Number)
            .sort((a, b) => b - a);
        
        // Encontrar el breakpoint adecuado
        for (const breakpoint of breakpoints) {
            if (screenWidth <= breakpoint) {
                selectedSource = sources[breakpoint];
            } else {
                break;
            }
        }
        
        return selectedSource;
    }
    
    /**
     * Optimiza una imagen al vuelo
     * Útil para imágenes subidas por usuarios
     */
    optimizeImage(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.match(/image.*/)) {
                reject(new Error('No es un archivo de imagen válido'));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Redimensionar si es necesario
                    let width = img.width;
                    let height = img.height;
                    
                    if (this.settings.resizeIfLarger && width > this.settings.maxWidth) {
                        height = (height * this.settings.maxWidth) / width;
                        width = this.settings.maxWidth;
                    }
                    
                    // Crear canvas para optimización
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Determinar formato y calidad
                    let mimeType, quality;
                    
                    if (this.settings.convertToWebP && this.hasWebP) {
                        mimeType = 'image/webp';
                        quality = this.settings.webpQuality;
                    } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                        mimeType = 'image/jpeg';
                        quality = this.settings.jpegQuality;
                    } else if (file.type === 'image/png') {
                        mimeType = 'image/png';
                        quality = this.settings.pngQuality;
                    } else {
                        // Mantener formato original
                        mimeType = file.type;
                        quality = 0.9;
                    }
                    
                    // Convertir canvas a blob optimizado
                    canvas.toBlob((blob) => {
                        resolve({
                            blob,
                            url: URL.createObjectURL(blob),
                            width,
                            height,
                            type: mimeType
                        });
                    }, mimeType, quality);
                };
                
                img.onerror = () => {
                    reject(new Error('Error al cargar la imagen'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsDataURL(file);
        });
    }
}

// Inicializar globalmente
window.imageOptimizer = new ImageOptimizer();

// Escuchar cambios de tamaño de ventana para actualizar imagenes
window.addEventListener('resize', function() {
    // Usar debounce para evitar muchas llamadas
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
        window.imageOptimizer.initializeImages();
    }, 200);
}); 