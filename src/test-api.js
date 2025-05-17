// Tạo bài viết mới
await testEndpoint('Tạo bài viết mới', 'POST', '/api/forum/posts', { 
  title: 'Bài viết test', 
  content: 'Nội dung bài viết test',
  userId: 1
}); 

// Tạo nhiệm vụ mới
await testEndpoint('Tạo nhiệm vụ mới', 'POST', '/api/tasks', {
  title: 'Nhiệm vụ test',
  description: 'Mô tả nhiệm vụ test',
  assignedTo: 4,
  assignedBy: 1,
  deadline: '2025-05-30T00:00:00.000Z',
  status: 'Pending'
}); 