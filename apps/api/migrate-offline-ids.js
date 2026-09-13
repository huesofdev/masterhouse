// Migration script: run new columns directly against MySQL
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.development' });

async function migrate() {
  // Parse DB_URL e.g. mysql://user:pass@host:port/dbname
  const url = new URL(process.env.DB_URL);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });

  console.log('Connected to database. Running migrations...');

  const statements = [
    `ALTER TABLE \`sales\` ADD COLUMN \`offline_receipt_number\` varchar(50) DEFAULT NULL`,
    `ALTER TABLE \`collection_receipts\` ADD COLUMN \`offline_receipt_number\` varchar(50) DEFAULT NULL`,
    `ALTER TABLE \`pre_orders\` ADD COLUMN \`reference_number\` varchar(50) DEFAULT NULL`,
    `ALTER TABLE \`pre_orders\` ADD COLUMN \`offline_receipt_number\` varchar(50) DEFAULT NULL`,
  ];

  for (const sql of statements) {
    try {
      await connection.execute(sql);
      console.log('✅ OK:', sql.substring(0, 80));
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ Column already exists, skipping:', sql.substring(0, 60));
      } else {
        console.error('❌ Error:', err.message, '\nSQL:', sql);
      }
    }
  }

  // Add unique constraint (ignore if exists)
  try {
    await connection.execute(`ALTER TABLE \`pre_orders\` ADD CONSTRAINT \`pre_orders_reference_number_unique\` UNIQUE(\`reference_number\`)`);
    console.log('✅ Added unique constraint on pre_orders.reference_number');
  } catch (err) {
    console.log('⚠️ Unique constraint already exists or skipped:', err.message);
  }

  await connection.end();
  console.log('\n✅ Migration complete!');
}

migrate().catch(console.error);
