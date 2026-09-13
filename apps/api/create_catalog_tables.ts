import { db } from './src/db';

async function run() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` binary(16) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`is_active\` boolean NOT NULL DEFAULT true,
        \`created_at\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`categories_id\` PRIMARY KEY(\`id\`)
      );
    `);
    console.log('Categories table created.');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`products\` (
        \`id\` binary(16) NOT NULL,
        \`category_id\` binary(16) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`sku\` varchar(100) NOT NULL,
        \`description\` text,
        \`base_price\` decimal(10,2) NOT NULL DEFAULT '0.00',
        \`uom\` enum('pieces','kg','g','l','ml','box','pack') NOT NULL DEFAULT 'pieces',
        \`is_active\` boolean NOT NULL DEFAULT true,
        \`created_at\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`products_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`products_sku_unique\` UNIQUE(\`sku\`)
      );
    `);
    console.log('Products table created.');

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
