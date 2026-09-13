import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection("mysql://root:admin@localhost:3307/masterhousenew");
  const [rows] = await conn.execute("SELECT * FROM branch_phones");
  console.log("masterhousenew:", JSON.stringify(rows, null, 2));
  
  const conn2 = await mysql.createConnection("mysql://root:admin@localhost:3307/masterhousenew1");
  const [rows2] = await conn2.execute("SELECT * FROM branch_phones");
  console.log("masterhousenew1:", JSON.stringify(rows2, null, 2));
  
  process.exit(0);
}
run();
