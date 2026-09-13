import { db } from './index';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Running manual schema fixes...');
  try {
    // 1. Alter guarantors table: Drop customer_id, add nic_front_url, nic_back_url
    await db.execute(sql`ALTER TABLE guarantors DROP COLUMN customer_id;`);
    console.log('Dropped customer_id from guarantors');
    
    await db.execute(sql`ALTER TABLE guarantors ADD COLUMN nic_front_url VARCHAR(500);`);
    console.log('Added nic_front_url to guarantors');
    
    await db.execute(sql`ALTER TABLE guarantors ADD COLUMN nic_back_url VARCHAR(500);`);
    console.log('Added nic_back_url to guarantors');

    // 2. Alter installment_contracts table: Add guarantor_signature_image_url
    await db.execute(sql`ALTER TABLE installment_contracts ADD COLUMN guarantor_signature_image_url VARCHAR(500);`);
    console.log('Added guarantor_signature_image_url to installment_contracts');

    console.log('All schema fixes applied successfully!');
  } catch (error) {
    console.error('Error applying schema fixes:', error);
  }
  process.exit(0);
}

run();
