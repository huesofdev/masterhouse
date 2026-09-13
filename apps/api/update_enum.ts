import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Updating sms_templates enum...');
  await db.execute(sql`ALTER TABLE sms_templates MODIFY COLUMN trigger_event ENUM('SALE_CREATED', 'COLLECTION_RECEIPT', 'PAYMENT_OVERDUE', 'DIRECT_SALE_CREATED') NOT NULL;`);
  
  console.log('Updating sms_logs enum...');
  await db.execute(sql`UPDATE sms_templates SET body_template = 'Dear {{name}}, thank you for purchasing {{product_name}}! We\\'ve received your downpayment of Rs.{{downpayment}}. {{upcoming_dues_message}} Thank you for choosing {{company_name}}!' WHERE trigger_event = 'SALE_CREATED';`);
  
  console.log('Done!');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
