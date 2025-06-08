#!/bin/bash

# Script para configurar certificados SSL con Let's Encrypt para Latiax Restaurant

# Colores para la salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Nombre de dominio
DOMAIN="latiax-restaurant.com"
WWW_DOMAIN="www.latiax-restaurant.com"
EMAIL="admin@latiax-restaurant.com" # Cambia esto a tu email real

# Banner de inicio
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}Configuración de SSL para $DOMAIN${NC}"
echo -e "${GREEN}=================================${NC}"

# Verificar si el script se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Este script debe ejecutarse como root${NC}"
    exit 1
fi

# Verificar el sistema operativo
if [ -f /etc/lsb-release ]; then
    # Ubuntu/Debian
    OS="debian"
    echo -e "${GREEN}Sistema operativo: Ubuntu/Debian${NC}"
elif [ -f /etc/redhat-release ]; then
    # CentOS/RHEL
    OS="centos"
    echo -e "${GREEN}Sistema operativo: CentOS/RHEL${NC}"
else
    echo -e "${RED}Sistema operativo no soportado${NC}"
    exit 1
fi

# Instalar Certbot según el sistema operativo
echo -e "${YELLOW}Instalando Certbot...${NC}"
if [ "$OS" = "debian" ]; then
    apt-get update
    apt-get install -y certbot python3-certbot-apache
elif [ "$OS" = "centos" ]; then
    yum install -y epel-release
    yum install -y certbot python3-certbot-apache
fi

# Detener el servidor web temporalmente (opcional)
echo -e "${YELLOW}Deteniendo el servidor web...${NC}"
if [ "$OS" = "debian" ]; then
    service apache2 stop || true
    service nginx stop || true
elif [ "$OS" = "centos" ]; then
    systemctl stop httpd || true
    systemctl stop nginx || true
fi

# Solicitar certificado
echo -e "${YELLOW}Solicitando certificado SSL...${NC}"
certbot certonly --standalone --non-interactive --agree-tos --email "$EMAIL" \
    -d "$DOMAIN" -d "$WWW_DOMAIN"

if [ $? -ne 0 ]; then
    echo -e "${RED}Error al solicitar el certificado SSL${NC}"
    
    # Iniciar el servidor web de nuevo
    if [ "$OS" = "debian" ]; then
        service apache2 start || true
        service nginx start || true
    elif [ "$OS" = "centos" ]; then
        systemctl start httpd || true
        systemctl start nginx || true
    fi
    
    exit 1
fi

echo -e "${GREEN}Certificado SSL obtenido correctamente${NC}"

# Configurar renovación automática
echo -e "${YELLOW}Configurando renovación automática...${NC}"
echo "0 3 * * * root certbot renew --quiet --post-hook \"systemctl reload nginx || systemctl reload apache2 || systemctl reload httpd\"" > /etc/cron.d/certbot-renew
chmod 644 /etc/cron.d/certbot-renew

# Verificar qué servidor web está instalado e iniciar la configuración correspondiente
if command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Configurando Nginx...${NC}"
    
    # Crear copia de seguridad de la configuración de Nginx
    NGINX_CONF="/etc/nginx/sites-available/latiax-restaurant.conf"
    if [ -f "$NGINX_CONF" ]; then
        cp "$NGINX_CONF" "$NGINX_CONF.bak"
        echo -e "${GREEN}Copia de seguridad creada: $NGINX_CONF.bak${NC}"
    fi
    
    # Copiar nueva configuración de nginx si existe
    if [ -f "nginx.conf" ]; then
        cp nginx.conf "$NGINX_CONF"
        echo -e "${GREEN}Nueva configuración de Nginx aplicada${NC}"
        
        # Crear enlace simbólico si no existe
        if [ ! -f "/etc/nginx/sites-enabled/latiax-restaurant.conf" ]; then
            ln -s "$NGINX_CONF" "/etc/nginx/sites-enabled/latiax-restaurant.conf"
        fi
        
        # Reiniciar Nginx
        systemctl restart nginx
    else
        echo -e "${RED}No se encontró el archivo nginx.conf${NC}"
    fi
    
elif command -v apache2 &> /dev/null || command -v httpd &> /dev/null; then
    echo -e "${YELLOW}Configurando Apache...${NC}"
    
    # Determinar la ubicación de la configuración de Apache según el sistema operativo
    if [ "$OS" = "debian" ]; then
        APACHE_CONF="/etc/apache2/sites-available/latiax-restaurant.conf"
        APACHE_ENABLED="/etc/apache2/sites-enabled/latiax-restaurant.conf"
        APACHE_CMD="apache2"
    elif [ "$OS" = "centos" ]; then
        APACHE_CONF="/etc/httpd/conf.d/latiax-restaurant.conf"
        APACHE_CMD="httpd"
    fi
    
    # Crear copia de seguridad de la configuración de Apache
    if [ -f "$APACHE_CONF" ]; then
        cp "$APACHE_CONF" "$APACHE_CONF.bak"
        echo -e "${GREEN}Copia de seguridad creada: $APACHE_CONF.bak${NC}"
    fi
    
    # Copiar nueva configuración de Apache si existe
    if [ -f "apache.conf" ]; then
        cp apache.conf "$APACHE_CONF"
        echo -e "${GREEN}Nueva configuración de Apache aplicada${NC}"
        
        # Crear enlace simbólico si es Ubuntu/Debian y no existe
        if [ "$OS" = "debian" ] && [ ! -f "$APACHE_ENABLED" ]; then
            a2ensite latiax-restaurant.conf
        fi
        
        # Reiniciar Apache
        systemctl restart $APACHE_CMD
    else
        echo -e "${RED}No se encontró el archivo apache.conf${NC}"
    fi
fi

echo -e "${GREEN}¡Configuración de SSL completada con éxito!${NC}"
echo -e "${GREEN}Certificado instalado en: /etc/letsencrypt/live/$DOMAIN/${NC}"
echo -e "${GREEN}Renovación automática configurada mediante cron${NC}"
echo -e "${YELLOW}Nota: La renovación se intentará automáticamente cada día a las 3:00 AM${NC}"

# Verificar que el servidor web está funcionando
echo -e "${YELLOW}Verificando el estado del servidor web...${NC}"
if command -v nginx &> /dev/null; then
    systemctl status nginx --no-pager
elif command -v apache2 &> /dev/null; then
    systemctl status apache2 --no-pager
elif command -v httpd &> /dev/null; then
    systemctl status httpd --no-pager
fi

echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}Ahora puedes acceder a tu sitio de forma segura mediante https://$DOMAIN${NC}"
echo -e "${GREEN}=================================${NC}"

exit 0 