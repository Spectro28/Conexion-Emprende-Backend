import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DB_USER || !process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_PASS || !process.env.DB_PORT) {
    console.error("❌ Faltan variables de entorno para la base de datos");
    process.exit(1);
}

export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: Number(process.env.DB_PORT),
});

pool.on('error', (err) => {
    console.error('❌ Error en la conexión a la base de datos:', err);
});
