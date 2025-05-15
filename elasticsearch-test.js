/**
 * Elasticsearch Connection Test Script
 * 
 * This script tests various connection options to Elasticsearch 9.0.0
 */

const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');
const readline = require('readline');

// Disable TLS certificate verification for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test connection function
async function testConnection(config, label) {
  try {
    console.log(`\n🔄 Testing ${label}...`);
    
    const client = new Client(config);
    const info = await client.info();
    
    console.log('✅ Connection successful!');
    console.log(`📊 Elasticsearch version: ${info.version.number}`);
    console.log(`📍 Connected to: ${config.node}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}`);
    console.error(`   Error type: ${error.name}`);
    if (error.meta && error.meta.body) {
      console.error(`   Details: ${JSON.stringify(error.meta.body, null, 2)}`);
    }
    return false;
  }
}

// Main function
async function main() {
  try {
    // Ask for password
    const password = await new Promise((resolve) => {
      rl.question('Enter Elasticsearch password for user "elastic": ', (answer) => {
        resolve(answer || '');
      });
    });

    // Test HTTPS connection with auth
    const httpsWithAuthConfig = {
      node: 'https://localhost:9200',
      auth: {
        username: 'elastic',
        password: password
      },
      tls: {
        rejectUnauthorized: false
      }
    };
    await testConnection(httpsWithAuthConfig, 'HTTPS with authentication');

    // Test HTTP connection with auth
    const httpWithAuthConfig = {
      node: 'http://localhost:9200',
      auth: {
        username: 'elastic',
        password: password
      }
    };
    await testConnection(httpWithAuthConfig, 'HTTP with authentication');

    // Test HTTPS without auth
    const httpsConfig = {
      node: 'https://localhost:9200',
      tls: {
        rejectUnauthorized: false
      }
    };
    await testConnection(httpsConfig, 'HTTPS without authentication');

    // Test HTTP without auth
    const httpConfig = {
      node: 'http://localhost:9200'
    };
    await testConnection(httpConfig, 'HTTP without authentication');

    // Tips based on Elasticsearch 9.0.0 requirements
    console.log('\n📋 Tips for Elasticsearch 9.0.0:');
    console.log('1. Elasticsearch 9.0.0 uses HTTPS by default with self-signed certificates');
    console.log('2. Authentication is mandatory');
    console.log('3. Default username is "elastic"');
    console.log('4. Password is generated during first startup - check logs');
    console.log('5. For production, configure SSL properly with valid certificates');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    rl.close();
  }
}

// Run the script
main(); 