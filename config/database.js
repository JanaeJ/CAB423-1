// In-memory database configuration
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password: '$2a$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ',
    role: 'admin',
    createdAt: new Date('2024-01-01')
  },
  {
    id: 2,
    username: 'user1',
    email: 'user1@example.com',
    password: '$2a$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ',
    role: 'user',
    createdAt: new Date('2024-01-02')
  }
];

const tasks = [];
const processedVideos = [];

module.exports = {
  users,
  tasks,
  processedVideos
};