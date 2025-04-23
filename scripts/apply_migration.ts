import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

// Crea una connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigration(migrationFile: string) {
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
  } finally {
    // Chiude la connessione al pool
    await pool.end();
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.error('Usage: npx tsx scripts/apply_migration.ts <migration-file>');
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