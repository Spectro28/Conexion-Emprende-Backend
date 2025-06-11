import { Pool } from 'pg';

// Configuración de la conexión a la base de datos
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'CONEXIONEMPRENDE_DB'
});
import * as fs from 'fs';
import * as path from 'path';

export async function runMigrations() {
    try {
        console.log('🔹 Iniciando migraciones...');
        
        // Leer todos los archivos de migración
        const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'))
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of migrationFiles) {
            console.log(`🔹 Ejecutando migración: ${file}`);
            const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf-8');
            try {
                await pool.query(sql);
                console.log(`✅ Migración ${file} completada`);
            } catch (error) {
                console.error(`❌ Error en migración ${file}:`, error);
            }
        }

        console.log('✅ Todas las migraciones completadas');
    } catch (error) {
        console.error('❌ Error en migraciones:', error);
    }
}

runMigrations();
