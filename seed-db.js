const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function seed() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '26121999',
    database: 'staffdev'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Kiểm tra và tạo department nếu chưa có
    const deptCount = await client.query('SELECT COUNT(*) FROM departments');
    if (parseInt(deptCount.rows[0].count) === 0) {
      console.log('Seeding departments...');
      await client.query(`
        INSERT INTO departments (department_name) VALUES
        ('IT'),
        ('HR'),
        ('Finance'),
        ('Marketing'),
        ('Sales')
      `);
      console.log('Departments created successfully');
    } else {
      console.log('Departments already exist, skipping...');
    }

    // Kiểm tra và tạo user nếu chưa có
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('Seeding users...');
      
      // Tạo mật khẩu mã hóa
      const hashedPassword = await bcrypt.hash('password', 10);
      
      // Thêm admin
      await client.query(`
        INSERT INTO users (cccd, password, email, phone, full_name, role, department_id)
        VALUES ('034095000123', $1, 'admin@example.com', '0912345678', 'Administrator', 'Admin', 1)
      `, [hashedPassword]);
      
      // Thêm nhân viên
      await client.query(`
        INSERT INTO users (cccd, password, email, phone, full_name, role, department_id)
        VALUES 
        ('034095000124', $1, 'employee@example.com', '0912345679', 'Sample Employee', 'Employee', 2),
        ('034095000125', $1, 'manager@example.com', '0912345680', 'Sample Manager', 'TeamLeader', 3)
      `, [hashedPassword]);
      
      console.log('Users created successfully');
    } else {
      console.log('Users already exist, skipping...');
    }

    console.log('Database seeding completed');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

seed();