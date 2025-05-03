// src/scripts/check-database.ts
import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env file
dotenv.config();

// Các bảng cần kiểm tra
const requiredTables = [
  'users',
  'departments',
  'profiles',
  'attendance',
  'training_paths',
  'training_courses',
  'user_courses',
  'tasks',
  'assignments',
  'submissions',
  'documents',
  'notifications',
  'forum_posts',
  'forum_comments'
];

async function checkDatabase() {
  try {
    // Kết nối đến database
    console.log('Connecting to database...');
    const connection = await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'staffdev',
      synchronize: false,
      logging: false
    });
    
    console.log('Connected to database successfully!');
    
    // Kiểm tra từng bảng
    const missingTables: string[] = [];
    for (const table of requiredTables) {
      try {
        const result = await connection.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        const exists = result[0]?.exists || false;
        if (!exists) {
          missingTables.push(table);
        }
      } catch (error) {
        console.error(`Error checking table ${table}:`, error.message);
      }
    }
    
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist!');
    } else {
      console.warn(`❌ Missing tables: ${missingTables.join(', ')}`);
      console.log('You should run the create_database.sql script to create all tables.');
      console.log('Command: npm run create-db');
    }
    
    // Đóng kết nối
    await connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabase();