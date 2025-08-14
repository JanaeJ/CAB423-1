const pool = require('../db');

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

exports.create = async (jobData) => {
  const conn = await pool.getConnection();
  const { userId, originalName, inputPath, resolution, quality, codec } = jobData;
  
  const result = await conn.query(`
    INSERT INTO video_jobs (user_id, original_name, input_path, resolution, quality, codec, status) 
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `, [userId, originalName, inputPath, resolution, quality, codec]);
  
  conn.release();
  return { 
    id: Number(result.insertId), 
    ...jobData, 
    status: 'pending',
    progress: 0 
  };
};

exports.update = async (id, updateData) => {
  const conn = await pool.getConnection();
  const fields = [];
  const values = [];
  
  Object.keys(updateData).forEach(key => {
    fields.push(`${key} = ?`);
    values.push(updateData[key]);
  });
  
  values.push(id);
  
  const result = await conn.query(
    `UPDATE video_jobs SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  conn.release();
  return { updated: result.affectedRows > 0 };
};

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