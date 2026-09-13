import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection("mysql://root:admin@localhost:3307/masterhousenew");
  const [rows] = await conn.execute("SELECT * FROM branches");
  console.log("masterhousenew branches:", JSON.stringify(rows, null, 2));
  process.exit(0);
}
run();
