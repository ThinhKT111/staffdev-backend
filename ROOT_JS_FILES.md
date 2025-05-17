# ROOT JAVASCRIPT FILES DOCUMENTATION

This document explains all JavaScript files located in the root directory of the StaffDev backend project and how to use them.

## Redis-Related Scripts

### 1. `test-redis-wsl.js`
**Purpose**: Tests Redis connection to a WSL (Windows Subsystem for Linux) instance.
**How to use**:
```bash
node test-redis-wsl.js
```
This script attempts to connect to Redis running at 192.168.178.204:6379, sets a test value, and retrieves it to verify the connection is working properly.

### 2. `update-redis-config.js`
**Purpose**: Updates your NestJS application to work with Redis running in WSL.
**How to use**:
```bash
node update-redis-config.js
```
This script:
- Detects your WSL IP address
- Creates/updates `src/common/services/redis.service.ts` with proper WSL configuration
- Updates `shared.module.ts` to include the RedisService
- Creates a `.env` file with the correct Redis configuration
- Creates a test script to verify the connection

### 3. `setup-redis-wsl.js`
**Purpose**: Simpler script for Redis-WSL integration setup.
**How to use**:
```bash
node setup-redis-wsl.js
```
This script tests the Redis connection to WSL, creates a proper `.env` file, and provides instructions for fixing Redis in WSL if the connection fails.

### 4. `redis-config.js`
**Purpose**: Basic Redis configuration and connection test.
**How to use**:
```bash
node redis-config.js
```
Tests connection to Redis locally (localhost:6379), performs basic operations, and provides guidance for configuring Redis in NestJS.

### 5. `redis-check.js`
**Purpose**: Simple Redis connection check to WSL.
**How to use**:
```bash
node redis-check.js
```
A lightweight script to verify Redis connection to WSL by performing a ping test and a basic read/write operation.

### 6. `test-redis-cache.js`
**Purpose**: Tests Redis caching functionality with PostgreSQL data.
**How to use**:
```bash
node test-redis-cache.js
```
This script demonstrates Redis caching patterns by:
- Retrieving data from PostgreSQL
- Storing it in Redis cache
- Testing cache hits/misses
- Demonstrating different cache data structures (strings, hashes)

## Elasticsearch-Related Scripts

### 7. `elasticsearch-config.js`
**Purpose**: Configures Elasticsearch for your application.
**How to use**:
```bash
node elasticsearch-config.js
```
This script:
- Tests connection to Elasticsearch
- Lists existing indices
- Creates required indices for your application (tasks, documents, notifications, forum_posts)
- Sets up proper mappings and analyzers
- Provides guidance for configuring Elasticsearch in NestJS

### 8. `elasticsearch-test.js`
**Purpose**: Tests various Elasticsearch connection options.
**How to use**:
```bash
node elasticsearch-test.js
```
This script tests different connection methods to Elasticsearch:
- HTTPS with authentication
- HTTP with authentication
- HTTPS without authentication
- HTTP without authentication
It prompts for the Elasticsearch password and provides guidance for Elasticsearch 9.0.0 configuration.

### 9. `test-es-index.js`
**Purpose**: Tests indexing data from PostgreSQL to Elasticsearch.
**How to use**:
```bash
node test-es-index.js
```
This script:
- Retrieves data from PostgreSQL (forum posts)
- Creates/verifies an Elasticsearch index
- Indexes the data into Elasticsearch
- Performs a test search to verify indexing

## Database and System Scripts

### 10. `test-db.js`
**Purpose**: Tests PostgreSQL database connection and queries data.
**How to use**:
```bash
node test-db.js
```
This script:
- Tests connection to PostgreSQL
- Lists all tables in the database
- Samples data from key tables (Users, Departments, ForumPosts)
- Reports counts and sample records

### 11. `setup-env.js`
**Purpose**: Sets up the `.env` file for your application.
**How to use**:
```bash
node setup-env.js
```
This script creates a `.env` file with default configuration values, prompting for the Elasticsearch password if needed.

### 12. `stack-status.js`
**Purpose**: Checks the status of all backend services.
**How to use**:
```bash
node stack-status.js
```
This comprehensive script:
- Tests connections to PostgreSQL, Redis, and Elasticsearch
- Checks if the NestJS backend is running
- Verifies required Elasticsearch indices
- Provides a complete status report
- Offers guidance for starting any services that aren't running

## General Usage Pattern

Most of these scripts are utility tools to help you set up, configure, and troubleshoot your backend services. The typical workflow would be:

1. Set up your environment with `setup-env.js`
2. Configure Redis with `update-redis-config.js` or `setup-redis-wsl.js` if using WSL
3. Configure Elasticsearch with `elasticsearch-config.js`
4. Verify all services are running properly with `stack-status.js`
5. Use the specific test scripts for debugging issues with individual components 