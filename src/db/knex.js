import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

// Optional: log the env variables to ensure they are loaded
console.log('Connecting to DB with the following credentials:');
console.log({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306, // ensure port is a number
  },
  pool: { min: 0, max: 7 }, // optional connection pool
  acquireConnectionTimeout: 10000, // optional timeout
});

export default db;
