const axios = require('axios');

// Cấu hình cơ bản
const BASE_URL = 'http://localhost:3000/api';
let ACCESS_TOKEN = null;
let USER_ID = null;
let PROFILE_ID = null;
let TEST_USER_ID = null;
let TEST_PROFILE_ID = null;
let DEPARTMENT_ID = null;
let FORUM_POST_ID = null;
let COURSE_ID = null;

const testResults = {
  success: 0,
  fail: 0,
  errors: []
};

// Hàm trợ giúp
const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true // Luôn trả về promise resolved để xử lý lỗi tự định nghĩa
});

// Hàm gửi request với token xác thực nếu có
async function authRequest(method, url, data = null) {
  const headers = {};
  
  // Thêm token xác thực nếu có
  if (ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${ACCESS_TOKEN}`;
    console.log(`[DEBUG] Using token: ${ACCESS_TOKEN.substring(0, 15)}...`);
  }
  
  try {
    let response;
    if (method.toLowerCase() === 'get') {
      response = await api.get(url, { headers });
    } else {
      response = await api[method.toLowerCase()](url, data, { headers });
    }
    
    // Kiểm tra nếu response có token mới thì cập nhật
    if (response.data && response.data.access_token) {
      console.log('[DEBUG] Received new access token');
      ACCESS_TOKEN = response.data.access_token;
    }
    
    return response;
  } catch (error) {
    console.error(`Network error when calling ${method} ${url}:`, error.message);
    return { status: 0, data: { error: error.message } };
  }
}

// Hàm ghi log kết quả test
function logTestResult(testName, success, response, expectedCode = 200) {
  const status = response.status;
  // Coi mã 201 như là thành công khi kiểm tra đăng nhập
  const isSuccess = success && (
    status === expectedCode || 
    (expectedCode === 'any' && status < 500) ||
    (expectedCode === 200 && status === 201) // Cho phép 201 khi mong đợi 200
  );

  if (isSuccess) {
    console.log(`✅ ${testName} - SUCCESS (${status})`);
    testResults.success++;
  } else {
    console.log(`❌ ${testName} - FAILED (${status})`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    testResults.fail++;
    testResults.errors.push({
      test: testName,
      status,
      data: response.data
    });
  }
  
  return isSuccess;
}

// Thêm hàm để debug JWT
function decodeJWT(token) {
  console.log('[DEBUG] Decoding JWT token...');
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
    console.log('[DEBUG] JWT Payload:', JSON.stringify(payload, null, 2));
    return payload;
  } catch (error) {
    console.error('[DEBUG] Error decoding JWT:', error.message);
    return null;
  }
}

// Add a function to generate a unique timestamp suffix for test data and a high ID
function getUniqueSuffix() {
  return Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// Generate a unique phone number that won't conflict with existing ones
function getUniquePhone() {
  // Create a phone starting with '099' followed by 8 random digits
  return '099' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
}

// Generate a unique CCCD that won't conflict with existing ones
function getUniqueCCCD() {
  // Create a CCCD with 'TEST' prefix followed by 12 random digits
  return 'TEST' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
}

// Generate a very high ID to avoid conflicts with database data
function getHighId() {
  // Start with a base of 100,000 to be well above any existing IDs
  return 100000 + Math.floor(Math.random() * 10000);
}

// 1. KIỂM TRA XÁC THỰC (AUTHENTICATION)
async function testAuth() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG XÁC THỰC =====');
  
  // 1.1 Kiểm tra đăng nhập với tài khoản hợp lệ
  console.log('\n>> Kiểm tra đăng nhập với tài khoản hợp lệ');
  const loginResponse = await authRequest('post', '/auth/login', {
    cccd: 'CCCD0000000001', // Admin từ dữ liệu mẫu
    password: 'password'
  });
  
  const loginSuccess = logTestResult('Đăng nhập', true, loginResponse);
  
  if (loginSuccess) {
    ACCESS_TOKEN = loginResponse.data.access_token;
    USER_ID = loginResponse.data.user.userId;
    console.log(`Đăng nhập thành công với userId: ${USER_ID}, role: ${loginResponse.data.user.role}`);
    
    // Debug JWT payload
    if (ACCESS_TOKEN) {
      decodeJWT(ACCESS_TOKEN);
    }
  } else {
    console.log('Đăng nhập thất bại, không thể tiếp tục các test yêu cầu xác thực');
    return false;
  }
  
  // 1.2 Kiểm tra đăng nhập với tài khoản không hợp lệ
  console.log('\n>> Kiểm tra đăng nhập với tài khoản không hợp lệ');
  const invalidLoginResponse = await authRequest('post', '/auth/login', {
    cccd: 'invalid_cccd',
    password: 'wrong_password'
  });
  
  logTestResult('Đăng nhập không hợp lệ', invalidLoginResponse.status === 401, invalidLoginResponse, 401);
  
  // 1.3 Kiểm tra thông tin thiết bị đăng nhập
  console.log('\n>> Kiểm tra lấy thông tin thiết bị đăng nhập');
  const devicesResponse = await authRequest('post', '/auth/devices');
  logTestResult('Lấy danh sách thiết bị', true, devicesResponse);
  
  // 1.4 Kiểm tra đăng ký tài khoản mới
  console.log('\n>> Kiểm tra đăng ký tài khoản mới');
  const uniqueSuffix = getUniqueSuffix();
  const registerResponse = await authRequest('post', '/auth/register', {
    cccd: getUniqueCCCD(),
    email: `user${uniqueSuffix}@example.com`,
    password: 'password123',
    phone: getUniquePhone(),
    fullName: `Test User ${uniqueSuffix}`,
    role: 'Employee',
    departmentId: 1
  });
  
  const registerSuccess = logTestResult('Đăng ký tài khoản', true, registerResponse, 201);
  
  if (registerSuccess) {
    TEST_USER_ID = registerResponse.data.user_id;
    console.log(`Đăng ký thành công với userId: ${TEST_USER_ID}`);
  }
  
  // 1.5 Kiểm tra quên mật khẩu
  console.log('\n>> Kiểm tra quên mật khẩu');
  const forgotPasswordResponse = await authRequest('post', '/auth/forgot-password', {
    email: 'admin@example.com'
  });
  
  const tokenResetPassword = forgotPasswordResponse.data.token;
  logTestResult('Quên mật khẩu', true, forgotPasswordResponse);
  
  if (tokenResetPassword) {
    // 1.6 Kiểm tra đặt lại mật khẩu
    console.log('\n>> Kiểm tra đặt lại mật khẩu');
    const resetPasswordResponse = await authRequest('post', '/auth/reset-password', {
      token: tokenResetPassword,
      newPassword: 'password' // Giữ nguyên mật khẩu cũ để không ảnh hưởng đến các test khác
    });
    
    logTestResult('Đặt lại mật khẩu', true, resetPasswordResponse);
  }
  
  // 1.7 Kiểm tra đổi mật khẩu
  console.log('\n>> Kiểm tra đổi mật khẩu');
  const changePasswordResponse = await authRequest('patch', '/auth/change-password', {
    currentPassword: 'password',
    newPassword: 'password' // Giữ nguyên mật khẩu để không ảnh hưởng đến các test tiếp theo
  });
  
  logTestResult('Đổi mật khẩu', true, changePasswordResponse);
  
  return true;
}

// 2. KIỂM TRA QUẢN LÝ HỒ SƠ (PROFILES)
async function testProfiles() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG QUẢN LÝ HỒ SƠ =====');
  
  if (!ACCESS_TOKEN) {
    console.log('Không có access token, bỏ qua test profiles');
    return false;
  }
  
  // 2.1 Lấy tất cả hồ sơ (chỉ dành cho Admin)
  console.log('\n>> Lấy tất cả hồ sơ');
  const profilesResponse = await authRequest('get', '/profiles');
  
  const profilesSuccess = logTestResult('Lấy tất cả hồ sơ', true, profilesResponse);
  
  if (profilesSuccess) {
    console.log(`Số lượng hồ sơ: ${profilesResponse.data.length}`);
  }
  
  // 2.2 Lấy hồ sơ của bản thân
  console.log('\n>> Lấy hồ sơ của bản thân');
  const myProfileResponse = await authRequest('get', '/profiles/me');
  
  const myProfileSuccess = logTestResult('Lấy hồ sơ của bản thân', true, myProfileResponse);
  
  if (myProfileSuccess) {
    PROFILE_ID = myProfileResponse.data.profile_id;
    console.log(`Profile ID của người dùng hiện tại: ${PROFILE_ID}`);
  }
  
  // 2.3 Cập nhật hồ sơ của bản thân
  console.log('\n>> Cập nhật hồ sơ của bản thân');
  const updateProfileResponse = await authRequest('patch', '/profiles/me', {
    experience: `Cập nhật bởi test script ${new Date().toISOString()}`
  });
  
  logTestResult('Cập nhật hồ sơ', true, updateProfileResponse);
  
  // 2.4 Lấy hồ sơ theo ID
  console.log('\n>> Lấy hồ sơ theo ID');
  const profileByIdResponse = await authRequest('get', `/profiles/${PROFILE_ID}`);
  
  logTestResult('Lấy hồ sơ theo ID', true, profileByIdResponse);
  
  // 2.5 Lấy hồ sơ theo user ID
  console.log('\n>> Lấy hồ sơ theo user ID');
  const profileByUserIdResponse = await authRequest('get', `/profiles/user/${USER_ID}`);
  
  logTestResult('Lấy hồ sơ theo user ID', true, profileByUserIdResponse);
  
  return true;
}

// 3. KIỂM TRA QUẢN LÝ PHÒNG BAN (DEPARTMENTS)
async function testDepartments() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG QUẢN LÝ PHÒNG BAN =====');
  
  if (!ACCESS_TOKEN) {
    console.log('Không có access token, bỏ qua test departments');
    return false;
  }
  
  // 3.1 Lấy tất cả phòng ban
  console.log('\n>> Lấy tất cả phòng ban');
  const departmentsResponse = await authRequest('get', '/departments');
  
  const departmentsSuccess = logTestResult('Lấy tất cả phòng ban', true, departmentsResponse);
  
  if (departmentsSuccess) {
    console.log(`Số lượng phòng ban: ${departmentsResponse.data.length}`);
    if (departmentsResponse.data.length > 0) {
      DEPARTMENT_ID = departmentsResponse.data[0].department_id;
    }
  }
  
  // 3.2 Lấy phòng ban theo ID
  if (DEPARTMENT_ID) {
    console.log('\n>> Lấy phòng ban theo ID');
    const departmentByIdResponse = await authRequest('get', `/departments/${DEPARTMENT_ID}`);
    
    logTestResult('Lấy phòng ban theo ID', true, departmentByIdResponse);
  }
  
  return true;
}

// 4. KIỂM TRA QUẢN LÝ NHIỆM VỤ (TASKS)
async function testTasks() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG QUẢN LÝ NHIỆM VỤ =====');
  
  if (!ACCESS_TOKEN) {
    console.log('Không có access token, bỏ qua test tasks');
    return false;
  }
  
  // 4.1 Lấy tất cả nhiệm vụ
  console.log('\n>> Lấy tất cả nhiệm vụ');
  const tasksResponse = await authRequest('get', '/tasks');
  
  const tasksSuccess = logTestResult('Lấy tất cả nhiệm vụ', true, tasksResponse);
  
  if (tasksSuccess) {
    console.log(`Số lượng nhiệm vụ: ${tasksResponse.data.length}`);
  }
  
  // 4.2 Tạo nhiệm vụ mới với unique suffix
  console.log('\n>> Tạo nhiệm vụ mới');
  const uniqueSuffix = getUniqueSuffix();
  const newTaskResponse = await authRequest('post', '/tasks', {
    title: `Nhiệm vụ test ${uniqueSuffix}`,
    description: 'Mô tả nhiệm vụ test',
    assignedTo: USER_ID,
    assignedBy: USER_ID,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Deadline 7 ngày sau
  });
  
  const taskCreateSuccess = logTestResult('Tạo nhiệm vụ mới', true, newTaskResponse, 201);
  
  let TASK_ID = null;
  if (taskCreateSuccess && newTaskResponse.data.task_id) {
    TASK_ID = newTaskResponse.data.task_id;
    console.log(`Task ID vừa tạo: ${TASK_ID}`);
    
    // 4.3 Lấy nhiệm vụ theo ID
    console.log('\n>> Lấy nhiệm vụ theo ID');
    const taskByIdResponse = await authRequest('get', `/tasks/${TASK_ID}`);
    
    logTestResult('Lấy nhiệm vụ theo ID', true, taskByIdResponse);
    
    // 4.4 Cập nhật nhiệm vụ
    console.log('\n>> Cập nhật nhiệm vụ');
    const updateTaskResponse = await authRequest('patch', `/tasks/${TASK_ID}`, {
      status: 'InProgress',
      description: `Mô tả đã cập nhật ${new Date().toISOString()}`
    });
    
    logTestResult('Cập nhật nhiệm vụ', true, updateTaskResponse);
  }
  
  // 4.5 Lấy nhiệm vụ được giao cho người dùng hiện tại
  console.log('\n>> Lấy nhiệm vụ được giao cho người dùng hiện tại');
  const myTasksResponse = await authRequest('get', '/tasks/me');
  
  logTestResult('Lấy nhiệm vụ của tôi', true, myTasksResponse);
  
  return true;
}

// 5. KIỂM TRA CHỨC NĂNG ĐÀO TẠO (TRAINING)
async function testTraining() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG ĐÀO TẠO =====');
  
  if (!ACCESS_TOKEN) {
    console.log('Không có access token, bỏ qua test training');
    return false;
  }
  
  // 5.1 Lấy tất cả lộ trình đào tạo
  console.log('\n>> Lấy tất cả lộ trình đào tạo');
  const pathsResponse = await authRequest('get', '/training/paths');
  
  const pathsSuccess = logTestResult('Lấy lộ trình đào tạo', true, pathsResponse);
  
  let PATH_ID = null;
  if (pathsSuccess) {
    console.log(`Số lượng lộ trình: ${pathsResponse.data.length}`);
    if (pathsResponse.data.length > 0) {
      PATH_ID = pathsResponse.data[0].training_path_id;
    }
  }
  
  // 5.2 Lấy tất cả khóa học
  console.log('\n>> Lấy tất cả khóa học');
  const coursesResponse = await authRequest('get', '/training/courses');
  
  const coursesSuccess = logTestResult('Lấy khóa học', true, coursesResponse);
  
  if (coursesSuccess) {
    console.log(`Số lượng khóa học: ${coursesResponse.data.length}`);
    if (coursesResponse.data.length > 0) {
      COURSE_ID = coursesResponse.data[0].course_id;
    }
  }
  
  // 5.3 Lấy thông tin lộ trình theo ID
  if (PATH_ID) {
    console.log(`\n>> Lấy thông tin lộ trình ID: ${PATH_ID}`);
    const pathByIdResponse = await authRequest('get', `/training/paths/${PATH_ID}`);
    
    logTestResult('Lấy lộ trình theo ID', true, pathByIdResponse);
  }
  
  // 5.4 Lấy thông tin khóa học theo ID
  if (COURSE_ID) {
    console.log(`\n>> Lấy thông tin khóa học ID: ${COURSE_ID}`);
    const courseByIdResponse = await authRequest('get', `/training/courses/${COURSE_ID}`);
    
    logTestResult('Lấy khóa học theo ID', true, courseByIdResponse);
  }
  
  // 5.5 Lấy khóa học của người dùng hiện tại
  console.log('\n>> Lấy khóa học của người dùng hiện tại');
  const myCoursesResponse = await authRequest('get', '/training/me/courses');
  
  logTestResult('Lấy khóa học của tôi', true, myCoursesResponse);
  
  return true;
}

// 6. KIỂM TRA DIỄN ĐÀN (FORUM)
async function testForum() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG DIỄN ĐÀN =====');
  
  if (!ACCESS_TOKEN) {
    console.log('Không có access token, bỏ qua test forum');
    return false;
  }
  
  // 6.1 Lấy tất cả bài viết
  console.log('\n>> Lấy tất cả bài viết');
  const postsResponse = await authRequest('get', '/forum/posts');
  
  const postsSuccess = logTestResult('Lấy bài viết diễn đàn', true, postsResponse);
  
  if (postsSuccess) {
    console.log(`Số lượng bài viết: ${postsResponse.data.length}`);
    if (postsResponse.data.length > 0) {
      FORUM_POST_ID = postsResponse.data[0].post_id;
    }
  }
  
  // 6.2 Tạo bài viết mới với unique suffix
  console.log('\n>> Tạo bài viết mới');
  const uniqueSuffix = getUniqueSuffix();
  const newPostResponse = await authRequest('post', '/forum/posts', {
    title: `Bài viết test ${uniqueSuffix}`,
    content: 'Nội dung bài viết test',
    userId: USER_ID
  });
  
  const postCreateSuccess = logTestResult('Tạo bài viết mới', true, newPostResponse, 201);
  
  let NEW_POST_ID = null;
  if (postCreateSuccess && newPostResponse.data.post_id) {
    NEW_POST_ID = newPostResponse.data.post_id;
    console.log(`Post ID vừa tạo: ${NEW_POST_ID}`);
    
    // 6.3 Lấy bài viết theo ID
    console.log('\n>> Lấy bài viết theo ID');
    const postByIdResponse = await authRequest('get', `/forum/posts/${NEW_POST_ID}`);
    
    logTestResult('Lấy bài viết theo ID', true, postByIdResponse);
    
    // 6.4 Cập nhật bài viết
    console.log('\n>> Cập nhật bài viết');
    const updatePostResponse = await authRequest('patch', `/forum/posts/${NEW_POST_ID}`, {
      content: `Nội dung đã cập nhật ${new Date().toISOString()}`
    });
    
    logTestResult('Cập nhật bài viết', true, updatePostResponse);
    
    // 6.5 Đăng bình luận cho bài viết
    console.log('\n>> Đăng bình luận cho bài viết');
    const newCommentResponse = await authRequest('post', `/forum/posts/${NEW_POST_ID}/comments`, {
      content: `Bình luận test ${new Date().toISOString()}`,
      userId: USER_ID,
      postId: NEW_POST_ID
    });
    
    const commentCreateSuccess = logTestResult('Đăng bình luận', true, newCommentResponse, 201);
    
    // 6.6 Lấy bình luận của bài viết
    console.log('\n>> Lấy bình luận của bài viết');
    const commentsResponse = await authRequest('get', `/forum/posts/${NEW_POST_ID}/comments`);
    
    logTestResult('Lấy bình luận', true, commentsResponse);
  }
  
  return true;
}

// 7. KIỂM TRA CHỨC NĂNG CHẤM CÔNG (ATTENDANCE)
async function testAttendance() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG CHẤM CÔNG =====');
  
  if (!ACCESS_TOKEN) {
    console.log('Không có access token, bỏ qua test attendance');
    return false;
  }
  
  // 7.1 Lấy lịch sử chấm công
  console.log('\n>> Lấy lịch sử chấm công');
  const attendanceResponse = await authRequest('get', '/attendance');
  
  const attendanceSuccess = logTestResult('Lấy lịch sử chấm công', true, attendanceResponse);
  
  if (attendanceSuccess) {
    console.log(`Số lượng bản ghi chấm công: ${attendanceResponse.data.length}`);
  }
  
  // 7.2 Check-in
  console.log('\n>> Check-in');
  const checkInResponse = await authRequest('post', '/attendance/check-in');
  
  logTestResult('Check-in', true, checkInResponse, 400);
  
  // 7.3 Check-out
  console.log('\n>> Check-out');
  const checkOutResponse = await authRequest('post', '/attendance/check-out');
  
  logTestResult('Check-out', true, checkOutResponse, 400);
  
  // 7.4 Đăng ký nghỉ phép với unique suffix và future date
  console.log('\n>> Đăng ký nghỉ phép');
  // Generate a future date for leave request
  const uniqueLeaveId = getUniqueSuffix();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 14); // Add 14 days in the future
  const leaveRequest = {
    leave_type: 'Annual',
    leave_date: futureDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    note: `Nghỉ phép test ${uniqueLeaveId}`
  };
  
  const leaveResponse = await authRequest('post', '/attendance/leave', leaveRequest);
  
  logTestResult('Đăng ký nghỉ phép', true, leaveResponse, 'any');
  
  return true;
}

// 8. KIỂM TRA QUẢN LÝ TÀI LIỆU (DOCUMENTS)
async function testDocuments() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG QUẢN LÝ TÀI LIỆU =====');
  
  if (!ACCESS_TOKEN) {
    console.log('Không có access token, bỏ qua test documents');
    return false;
  }
  
  // 8.1 Lấy tất cả tài liệu
  console.log('\n>> Lấy tất cả tài liệu');
  const documentsResponse = await authRequest('get', '/documents');
  
  const documentsSuccess = logTestResult('Lấy danh sách tài liệu', true, documentsResponse);
  
  let DOCUMENT_ID = null;
  if (documentsSuccess) {
    console.log(`Số lượng tài liệu: ${documentsResponse.data.length}`);
    if (documentsResponse.data.length > 0) {
      DOCUMENT_ID = documentsResponse.data[0].document_id;
    }
  }
  
  // 8.2 Tạo tài liệu mới với unique suffix
  console.log('\n>> Tạo tài liệu mới');
  const uniqueSuffix = getUniqueSuffix();
  const newDocumentResponse = await authRequest('post', '/documents', {
    title: `Tài liệu test ${uniqueSuffix}`,
    file_url: `https://example.com/test-document-${uniqueSuffix}.pdf`,
    category: 'Hướng dẫn',
    uploadedBy: USER_ID
  });
  
  const documentCreateSuccess = logTestResult('Tạo tài liệu mới', true, newDocumentResponse, 'any');
  
  let NEW_DOCUMENT_ID = null;
  if (documentCreateSuccess && newDocumentResponse.data && newDocumentResponse.data.document_id) {
    NEW_DOCUMENT_ID = newDocumentResponse.data.document_id;
    console.log(`Document ID vừa tạo: ${NEW_DOCUMENT_ID}`);
    
    // 8.3 Lấy tài liệu theo ID
    if (NEW_DOCUMENT_ID) {
      console.log('\n>> Lấy tài liệu theo ID');
      const documentByIdResponse = await authRequest('get', `/documents/${NEW_DOCUMENT_ID}`);
      
      logTestResult('Lấy tài liệu theo ID', true, documentByIdResponse);
    }
  }
  
  // 8.4 Lấy tài liệu theo danh mục
  console.log('\n>> Lấy tài liệu theo danh mục');
  const documentsByCategoryResponse = await authRequest('get', '/documents/category/Hướng dẫn');
  
  logTestResult('Lấy tài liệu theo danh mục', true, documentsByCategoryResponse);
  
  return true;
}

// 9. KIỂM TRA THÔNG BÁO (NOTIFICATIONS)
async function testNotifications() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG THÔNG BÁO =====');
  
  if (!ACCESS_TOKEN) {
    console.log('Không có access token, bỏ qua test notifications');
    return false;
  }
  
  // 9.1 Lấy tất cả thông báo
  console.log('\n>> Lấy tất cả thông báo');
  const notificationsResponse = await authRequest('get', '/notifications');
  
  const notificationsSuccess = logTestResult('Lấy danh sách thông báo', true, notificationsResponse);
  
  let NOTIFICATION_ID = null;
  if (notificationsSuccess) {
    console.log(`Số lượng thông báo: ${notificationsResponse.data.length}`);
    if (notificationsResponse.data.length > 0) {
      NOTIFICATION_ID = notificationsResponse.data[0].notification_id;
    }
  }
  
  // 9.2 Đánh dấu đã đọc thông báo
  if (NOTIFICATION_ID) {
    console.log('\n>> Đánh dấu đã đọc thông báo');
    const markReadResponse = await authRequest('patch', `/notifications/${NOTIFICATION_ID}/read`);
    
    logTestResult('Đánh dấu đã đọc thông báo', true, markReadResponse);
  }
  
  // 9.3 Đánh dấu đã đọc tất cả thông báo
  console.log('\n>> Đánh dấu đã đọc tất cả thông báo');
  const markAllReadResponse = await authRequest('patch', '/notifications/read-all');
  
  logTestResult('Đánh dấu đã đọc tất cả thông báo', true, markAllReadResponse);
  
  return true;
}

// 10. KIỂM TRA THÔNG TIN NGƯỜI DÙNG (USERS)
async function testUsers() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG QUẢN LÝ NGƯỜI DÙNG =====');
  
  if (!ACCESS_TOKEN) {
    console.log('Không có access token, bỏ qua test users');
    return false;
  }
  
  // 10.1 Lấy tất cả người dùng
  console.log('\n>> Lấy tất cả người dùng');
  const usersResponse = await authRequest('get', '/users');
  
  const usersSuccess = logTestResult('Lấy danh sách người dùng', true, usersResponse);
  
  if (usersSuccess) {
    console.log(`Số lượng người dùng: ${usersResponse.data.length}`);
  }
  
  // 10.2 Lấy thông tin người dùng theo ID
  console.log('\n>> Lấy thông tin người dùng theo ID');
  const userByIdResponse = await authRequest('get', `/users/${USER_ID}`);
  
  logTestResult('Lấy người dùng theo ID', true, userByIdResponse);
  
  // 10.3 Lấy thông tin người dùng đang đăng nhập
  console.log('\n>> Lấy thông tin người dùng đang đăng nhập');
  const currentUserResponse = await authRequest('get', '/users/me');
  
  logTestResult('Lấy thông tin người dùng hiện tại', true, currentUserResponse);
  
  return true;
}

// 11. KIỂM TRA ĐĂNG XUẤT (LOGOUT)
async function testLogout() {
  console.log('\n===== KIỂM THỬ CHỨC NĂNG ĐĂNG XUẤT =====');
  
  if (!ACCESS_TOKEN) {
    console.log('Không có access token, bỏ qua test logout');
    return false;
  }
  
  // 11.1 Đăng xuất
  console.log('\n>> Đăng xuất');
  const logoutResponse = await authRequest('post', '/auth/logout');
  
  logTestResult('Đăng xuất', true, logoutResponse);
  
  return true;
}

// Hàm chạy tất cả các test
async function runAllTests() {
  try {
    console.log('=======================================');
    console.log('KIỂM THỬ HỆ THỐNG BACKEND STAFFDEV');
    console.log('=======================================');
    
    const startTime = Date.now();
    
    // Đầu tiên kiểm tra xác thực
    const authSuccess = await testAuth();
    
    if (authSuccess) {
      // Nếu xác thực thành công, tiếp tục các test khác
      await testProfiles();
      await testDepartments();
      await testTasks();
      await testTraining();
      await testForum();
      await testAttendance();
      await testDocuments();
      await testNotifications();
      await testUsers();
      
      // Đăng xuất cuối cùng
      await testLogout();
    }
    
    // Báo cáo kết quả
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n=======================================');
    console.log('BÁO CÁO KẾT QUẢ KIỂM THỬ');
    console.log('=======================================');
    console.log(`Tổng số test: ${testResults.success + testResults.fail}`);
    console.log(`Thành công: ${testResults.success}`);
    console.log(`Thất bại: ${testResults.fail}`);
    console.log(`Thời gian thực hiện: ${duration.toFixed(2)} giây`);
    
    // Hiển thị danh sách các lỗi
    if (testResults.errors.length > 0) {
      console.log('\n=======================================');
      console.log('CHI TIẾT CÁC LỖI');
      console.log('=======================================');
      
      testResults.errors.forEach((error, index) => {
        console.log(`\n${index + 1}. Lỗi trong test: ${error.test}`);
        console.log(`   Status: ${error.status}`);
        console.log('   Response:', JSON.stringify(error.data, null, 2));
      });
    }
    
  } catch (error) {
    console.error('Có lỗi không mong muốn khi chạy test:', error);
  }
}

// Chạy tất cả các test
runAllTests(); 