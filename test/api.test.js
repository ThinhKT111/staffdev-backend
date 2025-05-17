const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let authToken = null;

async function testAuth() {
  try {
    // Test Login
    console.log('\n=== Testing Login ===');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      cccd: 'CCCD0000000001',
      password: 'password'
    });
    console.log('Login successful:', loginResponse.data);
    authToken = loginResponse.data.access_token;

    // Test Get Profile
    console.log('\n=== Testing Get Profile ===');
    const profileResponse = await axios.get(`${API_URL}/profiles/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('Profile retrieved:', profileResponse.data);

    // Test Attendance
    console.log('\n=== Testing Attendance ===');
    const checkInResponse = await axios.post(`${API_URL}/attendance/check-in`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('Check-in successful:', checkInResponse.data);

    // Test Training
    console.log('\n=== Testing Training ===');
    const coursesResponse = await axios.get(`${API_URL}/training/courses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('Courses retrieved:', coursesResponse.data);

    // Test Tasks
    console.log('\n=== Testing Tasks ===');
    const tasksResponse = await axios.get(`${API_URL}/tasks`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('Tasks retrieved:', tasksResponse.data);

    // Test Forum
    console.log('\n=== Testing Forum ===');
    const forumResponse = await axios.get(`${API_URL}/forum/posts`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('Forum posts retrieved:', forumResponse.data);

  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
    if (error.response && error.response.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAuth(); 