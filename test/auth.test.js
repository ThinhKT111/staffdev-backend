const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testAuth() {
  try {
    // 1. Test Register
    console.log('\n=== Testing Register ===');
    const registerData = {
      cccd: 'CCCD0000009999',
      email: 'testuser@example.com',
      password: 'password123',
      phone: '0900009999',
      fullName: 'Test User',
      role: 'Employee',
      departmentId: 1
    };

    try {
      const registerResponse = await axios.post(`${API_URL}/auth/register`, registerData);
      console.log('Register successful:', registerResponse.data);
    } catch (error) {
      console.log('Register failed (expected if user exists):', error.response?.data);
    }

    // 2. Test Login with Admin
    console.log('\n=== Testing Admin Login ===');
    let adminLoginResponse;
    try {
      adminLoginResponse = await axios.post(`${API_URL}/auth/login`, {
        cccd: 'CCCD0000000001',
        password: 'password'
      });
      console.log('Admin login successful:', JSON.stringify(adminLoginResponse.data, null, 2));
    } catch (error) {
      console.error('Admin login failed:', error.response ? error.response.data : error.message);
      throw error;
    }
    const adminToken = adminLoginResponse.data.access_token;

    // 3. Test Login with Employee
    console.log('\n=== Testing Employee Login ===');
    const employeeLoginResponse = await axios.post(`${API_URL}/auth/login`, {
      cccd: 'CCCD0000000004',
      password: 'password'
    });
    console.log('Employee login successful:', JSON.stringify(employeeLoginResponse.data, null, 2));
    const employeeToken = employeeLoginResponse.data.access_token;

    // 4. Test Invalid Login
    console.log('\n=== Testing Invalid Login ===');
    try {
      await axios.post(`${API_URL}/auth/login`, {
        cccd: 'CCCD0000000001',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('Invalid login failed as expected:', error.response?.data);
    }

    // 5. Test Profile Access with Admin Token
    console.log('\n=== Testing Profile Access with Admin Token ===');
    const adminProfileResponse = await axios.get(`${API_URL}/profiles/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Admin profile retrieved:', adminProfileResponse.data);

    // 6. Test Profile Access with Employee Token
    console.log('\n=== Testing Profile Access with Employee Token ===');
    const employeeProfileResponse = await axios.get(`${API_URL}/profiles/me`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    console.log('Employee profile retrieved:', employeeProfileResponse.data);

    // 7. Test Invalid Token
    console.log('\n=== Testing Invalid Token ===');
    try {
      await axios.get(`${API_URL}/profiles/me`, {
        headers: { Authorization: 'Bearer invalid_token' }
      });
    } catch (error) {
      console.log('Invalid token failed as expected:', error.response?.data);
    }

  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

testAuth(); 