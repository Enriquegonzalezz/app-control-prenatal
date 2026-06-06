#!/bin/sh
set -e

export PORT="${PORT:-8080}"

envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

cd /var/www

php artisan package:discover --ansi || true
php artisan storage:link || true
php artisan config:cache
php artisan route:cache
php artisan view:cache

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    php artisan migrate --force || true
fi

php-fpm -D

# Scheduler de Laravel (agenda indefinida: comando slots:extend, ver routes/console.php)
php artisan schedule:work >> /var/www/storage/logs/scheduler.log 2>&1 &

# Worker de cola: procesa jobs en background (push FCM, OTP email, etc.).
# Necesario cuando QUEUE_CONNECTION=database; inofensivo si es sync.
php artisan queue:work --tries=3 --sleep=3 --max-time=3600 --backoff=30 >> /var/www/storage/logs/queue.log 2>&1 &

exec nginx
