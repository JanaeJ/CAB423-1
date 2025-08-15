BigInt.prototype.toJSON = function() { return Number(this) }
const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'pass',
  database: process.env.DB_NAME || 'videojobs',
  connectionLimit: 5,
});

// Database initialization
(async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Database connection successful.');
    
    // Create users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create video jobs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS video_jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
        input_filename VARCHAR(255),
        output_filename VARCHAR(255),
        resolution VARCHAR(20) DEFAULT '720p',
        quality VARCHAR(20) DEFAULT 'medium',
        codec VARCHAR(20) DEFAULT 'h264',
        progress INT DEFAULT 0,
        cpu_time_seconds INT DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        INDEX(user_id),
        INDEX(status),
        INDEX(created_at)
      );
    `);
    
    // Insert test users
    await conn.query(`
      INSERT IGNORE INTO users (id, username, role) VALUES 
      (1, 'admin', 'admin'),
      (2, 'user1', 'user');
    `);
    
    console.log('Database tables initialized successfully.');
    
  } catch (err) {
    console.error('Database initialization failed:', err.message);
  } finally {
    if (conn) {
      conn.release();
      console.log('Database connection released.');
    }
  }
})();

module.exports = pool;