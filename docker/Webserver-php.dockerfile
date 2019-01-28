FROM php:7.2-fpm-alpine

WORKDIR /var/www/html
ADD ./docker/php.ini /usr/local/etc/php/conf.d/zz.ini
ADD ./src/api/ .
RUN chown -R www-data /var/www/html