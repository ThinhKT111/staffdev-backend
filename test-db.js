/**
 * Script kiểm tra kết nối database và truy vấn dữ liệu
 */

const { Client } = require('pg');

async function testDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '26121999',
    database: 'staffdev'
  });

  try {
    await client.connect();
    console.log('✅ Kết nối database thành công');

    // Kiểm tra các tables
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tableResult = await client.query(tableQuery);
    console.log('\n📋 Danh sách tables:');
    tableResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Thử truy vấn dữ liệu từ một vài tables
    try {
      console.log('\n📊 Kiểm tra dữ liệu từ bảng Users:');
      const userResult = await client.query('SELECT COUNT(*) as count FROM Users');
      console.log(`   Số lượng users: ${userResult.rows[0].count}`);
      
      if (parseInt(userResult.rows[0].count) > 0) {
        const userSample = await client.query('SELECT user_id, full_name, email, role FROM Users LIMIT 5');
        console.log('   Dữ liệu mẫu:');
        userSample.rows.forEach(user => {
          console.log(`   - ID: ${user.user_id}, Tên: ${user.full_name}, Email: ${user.email}, Role: ${user.role}`);
        });
      }
    } catch (err) {
      console.log(`   ❌ Lỗi truy vấn Users: ${err.message}`);
    }

    try {
      console.log('\n📊 Kiểm tra dữ liệu từ bảng Departments:');
      const deptResult = await client.query('SELECT COUNT(*) as count FROM Departments');
      console.log(`   Số lượng departments: ${deptResult.rows[0].count}`);
      
      if (parseInt(deptResult.rows[0].count) > 0) {
        const deptSample = await client.query('SELECT department_id, department_name FROM Departments LIMIT 5');
        console.log('   Dữ liệu mẫu:');
        deptSample.rows.forEach(dept => {
          console.log(`   - ID: ${dept.department_id}, Tên: ${dept.department_name}`);
        });
      }
    } catch (err) {
      console.log(`   ❌ Lỗi truy vấn Departments: ${err.message}`);
    }

    try {
      console.log('\n📊 Kiểm tra dữ liệu từ bảng ForumPosts:');
      const postResult = await client.query('SELECT COUNT(*) as count FROM ForumPosts');
      console.log(`   Số lượng posts: ${postResult.rows[0].count}`);
      
      if (parseInt(postResult.rows[0].count) > 0) {
        const postSample = await client.query('SELECT post_id, title, created_at FROM ForumPosts LIMIT 5');
        console.log('   Dữ liệu mẫu:');
        postSample.rows.forEach(post => {
          console.log(`   - ID: ${post.post_id}, Tiêu đề: ${post.title}, Ngày tạo: ${post.created_at}`);
        });
      }
    } catch (err) {
      console.log(`   ❌ Lỗi truy vấn ForumPosts: ${err.message}`);
    }

  } catch (err) {
    console.error('❌ Lỗi kết nối database:', err.message);
  } finally {
    await client.end();
    console.log('\n✅ Đóng kết nối database');
  }
}

testDatabase(); 