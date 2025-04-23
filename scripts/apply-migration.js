import { pool } from '../server/db.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration(migrationFile) {
  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    console.log(`Applying migration from: ${migrationPath}`);
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('SQL to execute:', sql);
    
    await pool.query(sql);
    console.log(`Migration ${migrationFile} applied successfully`);
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  }
}

// Esempi di utilizzo:
// node scripts/apply-migration.js create_contract_clauses.sql
async function main() {
  if (process.argv.length < 3) {
    console.error('Usage: node apply-migration.js <migration-file>');
    process.exit(1);
  }

  const migrationFile = process.argv[2];
  try {
    await applyMigration(migrationFile);
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();