import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://SteenbergEcom-Reviews_owner:npg_LBhFeu4YoT1H@ep-soft-silence-a5ajf2j4-pooler.us-east-2.aws.neon.tech/SteenbergEcom-Reviews?sslmode=require',
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

// Test DB connection when starting
pool.connect()
  .then(() => console.log('✅ Connected to the database!'))
  .catch((err) => console.error('❌ Database connection failed:', err));

export default pool;
