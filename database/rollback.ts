import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function runRollback() {
    try {
        console.log('🔹 Iniciando rollback...');
        
        // Obtener lista de archivos de migración en orden inverso
        const migrationsDir = path.join(__dirname, 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort().reverse();

        for (const file of migrationFiles) {
            console.log(`🔹 Ejecutando rollback: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await pool.query(sql);
            console.log(`✅ Rollback ${file} completado`);
        }

        console.log('✅ Rollback completado');
    } catch (error) {
        console.error('❌ Error en rollback:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runRollback();
