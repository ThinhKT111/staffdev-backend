import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Increase timeout for all tests
jest.setTimeout(30000); 