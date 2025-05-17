module.exports = {
  apps: [{
    name: 'staffdev-backend',
    script: 'dist/src/main.js',
    instances: 'max',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    out_file: 'logs/app-out.log',
    error_file: 'logs/app-error.log'
  }]
}; 