const { Client } = require('pg');
const axios = require('axios');
require('dotenv').config();

// Connection parameters from .env
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'staffdev',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '26121999',
});

// API base URL
const API_URL = `http://localhost:${process.env.PORT || 3000}/api`;
const testResults = [];

// Function to check sequence values
async function checkSequencesAndMaxIds() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Get list of all sequences
    const sequencesQuery = `
      SELECT c.relname AS sequence_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'S' AND n.nspname = 'public'
      ORDER BY c.relname;
    `;
    
    const sequencesResult = await client.query(sequencesQuery);
    const sequences = sequencesResult.rows.map(row => row.sequence_name);
    
    console.log(`Found ${sequences.length} sequences in the database`);
    
    // Table to sequence mapping
    const tableMap = {
      'assignments_assignment_id_seq': 'assignments',
      'attendance_attendance_id_seq': 'attendance',
      'departments_department_id_seq': 'departments',
      'documents_document_id_seq': 'documents',
      'forumcomments_comment_id_seq': 'forumcomments',
      'forumposts_post_id_seq': 'forumposts',
      'notifications_notification_id_seq': 'notifications',
      'profiles_profile_id_seq': 'profiles',
      'submissions_submission_id_seq': 'submissions',
      'tasks_task_id_seq': 'tasks',
      'trainingcourses_course_id_seq': 'trainingcourses',
      'trainingpaths_training_path_id_seq': 'trainingpaths',
      'usercourses_user_course_id_seq': 'usercourses',
      'users_user_id_seq': 'users',
    };
    
    // ID column names
    const idColumnMap = {
      'assignments': 'assignment_id',
      'attendance': 'attendance_id',
      'departments': 'department_id',
      'documents': 'document_id',
      'forumcomments': 'comment_id',
      'forumposts': 'post_id',
      'notifications': 'notification_id',
      'profiles': 'profile_id',
      'submissions': 'submission_id',
      'tasks': 'task_id',
      'trainingcourses': 'course_id',
      'trainingpaths': 'training_path_id',
      'usercourses': 'user_course_id',
      'users': 'user_id',
    };
    
    // Get current sequence values and max IDs
    for (const sequence of sequences) {
      // Get table name from sequence name
      const tableName = tableMap[sequence];
      const idColumn = idColumnMap[tableName];
      
      if (!tableName || !idColumn) {
        console.log(`Unknown sequence: ${sequence}`);
        continue;
      }
      
      // Get max ID from table
      const maxIdQuery = `SELECT COALESCE(MAX(${idColumn}), 0) AS max_id FROM ${tableName};`;
      const maxIdResult = await client.query(maxIdQuery);
      const maxId = parseInt(maxIdResult.rows[0].max_id, 10);
      
      // Get sequence value
      let sequenceValue = null;
      let sequenceStatus = 'unknown';
      let nextValue = null;
      
      try {
        // Get next value without consuming it
        const nextValueQuery = `SELECT last_value, is_called FROM ${sequence};`;
        const nextValueResult = await client.query(nextValueQuery);
        const lastValue = parseInt(nextValueResult.rows[0].last_value, 10);
        const isCalled = nextValueResult.rows[0].is_called;
        
        // If sequence has been called, next value will be last_value + 1, otherwise it's last_value
        nextValue = isCalled ? lastValue + 1 : lastValue;
        sequenceValue = lastValue;
        sequenceStatus = 'ok';
      } catch (error) {
        console.error(`Error getting next value for ${sequence}:`, error.message);
        sequenceStatus = 'error';
      }
      
      // Compare max ID and sequence value
      const isSequenceCorrect = nextValue > maxId;
      
      console.log(`${tableName}: max ID = ${maxId}, sequence next value = ${nextValue}, correct = ${isSequenceCorrect}`);
      
      testResults.push({
        table: tableName,
        sequence,
        maxId, 
        sequenceValue,
        nextValue,
        isSequenceCorrect,
        status: sequenceStatus
      });
    }
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Test create endpoints
async function testCreateEndpoints() {
  try {
    // Login to get token
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'password'
    });
    
    const token = loginResponse.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('\nTesting API endpoints:');
    
    // Test create task
    try {
      const taskResponse = await axios.post(`${API_URL}/tasks`, {
        title: 'Test Task',
        description: 'Test Description',
        assignedTo: 4,
        assignedBy: 1,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Pending'
      }, { headers });
      
      console.log('Create task success:', taskResponse.data.task_id);
      testResults.push({ endpoint: 'POST /tasks', status: 'success', id: taskResponse.data.task_id });
    } catch (error) {
      console.error('Create task error:', error.response?.data || error.message);
      testResults.push({ endpoint: 'POST /tasks', status: 'error', error: error.response?.data || error.message });
    }
    
    // Test create forum post
    try {
      const postResponse = await axios.post(`${API_URL}/forum/posts`, {
        title: 'Test Post',
        content: 'Test Content',
        userId: 1
      }, { headers });
      
      console.log('Create forum post success:', postResponse.data.post_id);
      testResults.push({ endpoint: 'POST /forum/posts', status: 'success', id: postResponse.data.post_id });
    } catch (error) {
      console.error('Create forum post error:', error.response?.data || error.message);
      testResults.push({ endpoint: 'POST /forum/posts', status: 'error', error: error.response?.data || error.message });
    }
    
    // Test create document (without file)
    try {
      const docResponse = await axios.post(`${API_URL}/documents`, {
        title: 'Test Document',
        file_url: 'https://example.com/test.pdf',
        category: 'Test',
        uploadedBy: 1
      }, { headers });
      
      console.log('Create document success:', docResponse.data.document_id);
      testResults.push({ endpoint: 'POST /documents', status: 'success', id: docResponse.data.document_id });
    } catch (error) {
      console.error('Create document error:', error.response?.data || error.message);
      testResults.push({ endpoint: 'POST /documents', status: 'error', error: error.response?.data || error.message });
    }
    
  } catch (error) {
    console.error('API test error:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await checkSequencesAndMaxIds();
  await testCreateEndpoints();
  
  console.log('\nTEST RESULTS:');
  console.log(JSON.stringify(testResults, null, 2));
}

runTests(); 