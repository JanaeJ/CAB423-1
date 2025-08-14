const pool = require('../db');

// Get all jobs
exports.getAll = async (userId = null) => {
  const conn = await pool.getConnection();
  let query = 'SELECT * FROM video_jobs';
  let params = [];
  
  if (userId) {
    query += ' WHERE user_id = ?';
    params.push(userId);
  }
  
  query += ' ORDER BY created_at DESC';
  const rows = await conn.query(query, params);
  conn.release();
  return rows;
};

// Get job by ID
exports.getById = async (id, userId = null) => {
  const conn = await pool.getConnection();
  let query = 'SELECT * FROM video_jobs WHERE id = ?';
  let params = [id];
  
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  
  const rows = await conn.query(query, params);
  conn.release();
  return rows[0];
};

// Create new job
exports.create = async (jobData) => {
  const conn = await pool.getConnection();
  const { 
    userId = 1, 
    title, 
    description = '', 
    inputFilename = 'test_video.mp4',
    resolution = '720p', 
    quality = 'medium', 
    codec = 'h264' 
  } = jobData;
  
  const result = await conn.query(`
    INSERT INTO video_jobs (
      user_id, title, description, input_filename, 
      resolution, quality, codec, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `, [userId, title, description, inputFilename, resolution, quality, codec]);
  
  conn.release();
  return { 
    id: Number(result.insertId), 
    userId,
    title,
    description,
    inputFilename,
    status: 'pending',
    progress: 0,
    resolution,
    quality,
    codec,
    createdAt: new Date()
  };
};

// Update job
exports.update = async (id, updateData) => {
  const conn = await pool.getConnection();
  const fields = [];
  const values = [];
  
  // Build dynamic update fields
  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updateData[key]);
    }
  });
  
  if (fields.length === 0) {
    conn.release();
    return { updated: false };
  }
  
  values.push(id);
  
  const result = await conn.query(
    `UPDATE video_jobs SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  conn.release();
  return { updated: result.affectedRows > 0 };
};

// Delete job
exports.remove = async (id, userId = null) => {
  const conn = await pool.getConnection();
  let query = 'DELETE FROM video_jobs WHERE id = ?';
  let params = [id];
  
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  
  const result = await conn.query(query, params);
  conn.release();
  return { deleted: result.affectedRows > 0 };
};