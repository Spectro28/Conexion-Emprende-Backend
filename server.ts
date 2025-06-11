import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import passport from 'passport';
import authRoutes from './src/routes/auth.routes';
import { pool } from './src/config/database';
import { runMigrations } from './database/run-migrations';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3003;

// 🔹 Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Inicializar Passport y estrategias
app.use(passport.initialize());

// 🔹 Configurar rutas
app.use('/auth', authRoutes);
console.log('✅ Rutas de autenticación registradas correctamente');


// 🔹 Ruta de prueba
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'API de Conexión Emprende' });
});

// 🔹 Ejecutar migraciones al iniciar el servidor
runMigrations()
    .then(() => console.log('✅ Migraciones completadas'))
    .catch(error => console.error('❌ Error en migraciones:', error));

// 🔹 Manejo de errores global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('❌ Error detectado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// 🔹 Manejo de rutas no encontradas
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`🔹 Petición no encontrada: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// 🔹 Iniciar el servidor
async function startServer() {
    try {
        await pool.connect();
        console.log("✅ Conectado a PostgreSQL");

        const server = app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
        });

        // Manejar cierre del servidor
        process.on('SIGINT', () => {
            server.close(() => {
                console.log('✅ Servidor cerrado correctamente');
            });
        });

    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// 🔹 Iniciar servidor
startServer();
