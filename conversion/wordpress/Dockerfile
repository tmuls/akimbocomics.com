# Matches the original server: PHP 7.0 + Apache (WordPress 4.7 predates PHP 8).
FROM php:7.0-apache
RUN docker-php-ext-install mysqli \
 && a2enmod rewrite \
 && printf '<Directory /var/www/html>\n  AllowOverride All\n</Directory>\n' > /etc/apache2/conf-enabled/allow-override.conf
