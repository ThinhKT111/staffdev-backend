/**
 * Script to set up .env file for StaffDev Backend
 * 
 * Usage: node setup-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env');

// Default configuration
const defaultConfig = {
  PORT: 3000,
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_USERNAME: 'postgres',
  DB_PASSWORD: '26121999',
  DB_DATABASE: 'staffdev',
  DB_SYNCHRONIZE: false,
  JWT_SECRET: 'staffdev-secret-key',
  JWT_EXPIRES_IN: '7d',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  REDIS_TTL: 3600,
  REDIS_MAX_OBJECTS: 1000,
  ELASTICSEARCH_NODE: 'https://localhost:9200',
  ELASTICSEARCH_USERNAME: 'elastic',
  ELASTICSEARCH_PASSWORD: '',
  SSL_REJECT_UNAUTHORIZED: false,
  MAX_FILE_SIZE: 5242880,
  UPLOAD_DIR: './uploads',
  ADMIN_EMAIL: 'admin@staffdev.com',
  ADMIN_PASSWORD: 'adminpassword'
};

// Check if .env file exists
if (fs.existsSync(envPath)) {
  console.log('\x1b[33m%s\x1b[0m', '.env file already exists. Do you want to overwrite it? (y/n)');
  rl.question('> ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      createEnvFile();
    } else {
      console.log('\x1b[32m%s\x1b[0m', 'Aborted. Existing .env file was not modified.');
      rl.close();
    }
  });
} else {
  createEnvFile();
}

async function createEnvFile() {
  console.log('\x1b[36m%s\x1b[0m', 'Setting up .env file with default configuration...');
  
  // Ask for Elasticsearch password
  console.log('\x1b[33m%s\x1b[0m', 'Please check Elasticsearch logs for the elastic user password.');
  console.log('\x1b[33m%s\x1b[0m', 'If you have a custom password, enter it below.');
  console.log('\x1b[33m%s\x1b[0m', 'If you don\'t have a password set yet, just press Enter:');
  
  rl.question('Elasticsearch Password > ', (password) => {
    defaultConfig.ELASTICSEARCH_PASSWORD = password;
    writeEnvFile();
    rl.close();
  });
}

function writeEnvFile() {
  // Convert config object to .env format
  let envContent = '';
  for (const [key, value] of Object.entries(defaultConfig)) {
    envContent += `${key}=${value}\n`;
  }
  
  // Write to .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\x1b[32m%s\x1b[0m', '.env file created successfully!');
  console.log('\x1b[36m%s\x1b[0m', 'Next steps:');
  console.log('\x1b[36m%s\x1b[0m', '1. Verify the connection to Elasticsearch using: node elasticsearch-config.js');
  console.log('\x1b[36m%s\x1b[0m', '2. Start your application: npm run start:dev');
} 