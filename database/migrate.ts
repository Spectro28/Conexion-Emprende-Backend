import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de la base de datos
dotenv.config();

if (!process.env.DB_USER || !process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_PASS || !process.env.DB_PORT) {
    console.error('❌ Faltan variables de entorno para la base de datos');
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: Number(process.env.DB_PORT),
});

async function runMigrations() {
    try {
        console.log('🔹 Iniciando migraciones...');
        
        // Obtener lista de archivos de migración
        const migrationsDir = path.join(__dirname, 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of migrationFiles) {
            console.log(`🔹 Ejecutando migración: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await pool.query(sql);
            console.log(`✅ Migración ${file} completada`);
        }

        console.log('✅ Todas las migraciones completadas');
    } catch (error) {
        console.error('❌ Error en migraciones:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
