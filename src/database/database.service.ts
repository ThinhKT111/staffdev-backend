// src/database/database.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectConnection() private connection: Connection) {}

  async onModuleInit() {
    await this.checkDatabaseTables();
  }

  async checkDatabaseTables() {
    try {
      // Kiểm tra xem bảng forum_posts có tồn tại không
      const tableExists = await this.checkTableExists('forum_posts');
      
      if (!tableExists) {
        this.logger.warn('Some database tables might be missing. You may need to run migrations or SQL scripts.');
        this.logger.warn('To create all tables, run the create_database.sql script in your database.');
        
        // Hướng dẫn người dùng
        console.log('\n---------------------------------------------');
        console.log('DATABASE SETUP REQUIRED');
        console.log('---------------------------------------------');
        console.log('It seems that your database tables are not set up correctly.');
        console.log('Please run the create_database.sql script to create all required tables:');
        console.log('\nFor PostgreSQL command line:');
        console.log('psql -U postgres -d staffdev -f create_database.sql');
        console.log('\nOr import the SQL file using pgAdmin.');
        console.log('---------------------------------------------\n');
      } else {
        this.logger.log('Database tables validated successfully.');
      }
    } catch (error) {
      this.logger.error(`Error checking database tables: ${error.message}`);
    }
  }

  async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.connection.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      
      return result[0]?.exists || false;
    } catch (error) {
      this.logger.error(`Error checking table ${tableName}: ${error.message}`);
      return false;
    }
  }

  async executeSQL(sqlFilePath: string): Promise<void> {
    try {
      if (!fs.existsSync(sqlFilePath)) {
        this.logger.error(`SQL file not found: ${sqlFilePath}`);
        return;
      }
      
      const sql = fs.readFileSync(sqlFilePath, 'utf8');
      await this.connection.query(sql);
      this.logger.log(`Successfully executed SQL from ${path.basename(sqlFilePath)}`);
    } catch (error) {
      this.logger.error(`Error executing SQL: ${error.message}`);
      throw error;
    }
  }
}