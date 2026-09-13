import { db } from './src/db';
import { sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

async function main() {
  console.log('Running manual migration for SMS tables...');

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sms_templates (
        id binary(16) PRIMARY KEY,
        trigger_event enum('SALE_CREATED', 'COLLECTION_RECEIPT', 'PAYMENT_OVERDUE') NOT NULL UNIQUE,
        body_template text NOT NULL,
        is_active tinyint(1) NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created sms_templates table successfully.');
    
    // Seed templates
    const templates = [
      { trigger: 'SALE_CREATED', template: 'Hi {{name}}, your sale {{sale_id}} is created successfully.' },
      { trigger: 'COLLECTION_RECEIPT', template: 'Hi {{name}}, received {{amount}}. Balance: {{balance}}' },
      { trigger: 'PAYMENT_OVERDUE', template: 'Hi {{name}}, your payment is overdue. Please pay ASAP to avoid penalties.' }
    ];
    
    for (const t of templates) {
      try {
        await db.execute(sql`
          INSERT IGNORE INTO sms_templates (id, trigger_event, body_template) 
          VALUES (UUID_TO_BIN(UUID()), ${t.trigger}, ${t.template})
        `);
      } catch (e) {
        console.error('Seed error:', e);
      }
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id binary(16) PRIMARY KEY,
        customer_id binary(16) NOT NULL,
        trigger_event enum('SALE_CREATED', 'COLLECTION_RECEIPT', 'PAYMENT_OVERDUE', 'CUSTOM') NOT NULL,
        reference_id binary(16),
        phone_number varchar(50) NOT NULL,
        message_body text NOT NULL,
        status enum('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
        provider_response text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        sent_at timestamp
      )
    `);
    console.log('Created sms_logs table successfully.');
  } catch (e) {
    console.error('Error creating table:', e);
  }

  process.exit(0);
}

main();
