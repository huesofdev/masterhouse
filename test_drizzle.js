const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const { sqliteTable, text } = require('drizzle-orm/sqlite-core');

const db = drizzle(new Database(':memory:'));
const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

db.run(require('drizzle-orm').sql`CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL)`);

try {
  db.insert(users).values({ id: '1', fullName: 'John' }).run();
  console.log("INSERT SUCCEEDED!");
} catch (e) {
  console.log("INSERT FAILED:", e.message);
}
