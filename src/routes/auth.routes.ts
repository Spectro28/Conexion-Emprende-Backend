import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { authJWT } from '../middleware/auth.middleware';
import { sendVerificationEmail } from '../services/email.service';
import { pool } from '../config/database';
import { sendResponse } from '../utils/response';
import * as authController from '../controllers/auth.controller';
import { User } from '../types/user'; 
import { randomBytes } from 'crypto';


dotenv.config();

// Interfaces para el JWT
interface JwtPayload {
    email: string;
    id?: number;
}

// 🔹 Middleware para manejar rutas asíncronas correctamente
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch((error) => {
            console.error('❌ Error en la ruta:', error);
            next(error);
        });
    };
};

// 🔹 Configurar el enrutador
const router = Router();

// 🔹 Ruta para autenticación con Google
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
}));

// 🔹 Callback de Google OAuth
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) throw new Error('Error en la autenticación de Google');

        const { redirectTo, ...user } = req.user as any;

        // Generar token de sesión
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const redirectUrl = redirectTo ? `${process.env.FRONTEND_URL}${redirectTo}?token=${token}` : `${process.env.FRONTEND_URL}/dashboard?token=${token}`;
        
        res.redirect(redirectUrl);
    })
);

//🔹 Ruta para login manual
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
    await authController.login(req, res);
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return sendResponse(res, 400, null, 'Email y contraseña son requeridos');
        }

        // Buscar usuario por email
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            return sendResponse(res, 401, null, 'Credenciales inválidas');
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return sendResponse(res, 401, null, 'Credenciales inválidas');
        }

        // Generar token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );

        return sendResponse(res, 200, {
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                perfil: user.perfil,
                is_verified: user.is_verified
            }
        }, 'Login exitoso');
    } catch (error) {
        console.error('❌ Error en login:', error);
        return sendResponse(res, 500, null, 'Error interno del servidor');
    }
}));

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
    await authController.register(req, res);
}));

router.post('/verify-email', async (req: Request, res: Response) => {
    try {
        const { verificationToken } = req.body;

        if (!verificationToken) {
            res.status(400).json({ error: 'Token no proporcionado' });
            return;
        }

        // Primero obtener el email del token de verificación
        const tokenResult = await pool.query(
            'SELECT email FROM verification_tokens WHERE token = $1',
            [verificationToken]
        );

        if (tokenResult.rowCount === 0) {
            res.status(404).json({ error: 'Token inválido o expirado' });
            return;
        }

        const email = tokenResult.rows[0].email;

        // Actualizar el estado de verificación del usuario
        const userResult = await pool.query(
            'UPDATE users SET is_verified = TRUE WHERE email = $1 RETURNING *',
            [email]
        );

        // Eliminar el token usado
        await pool.query('DELETE FROM verification_tokens WHERE token = $1', [verificationToken]);

        console.log(`✅ Email verificado para el usuario: ${email}`);
        res.status(200).json({
            status: 200,
            data: {
                is_verified: true,
                email: email
            },
            message: 'Correo verificado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error al verificar email:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



router.get('/get-email-from-temp-token', asyncHandler(async (req: Request, res: Response) => {
    try {
        const token = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
        if (!token || typeof token !== 'string') {
            console.error('❌ Token inválido recibido:', token);
            return sendResponse(res, 400, null, 'Token inválido');
        }

        console.log(`🔹 Token recibido para obtener email: ${token}`);

        // 🔹 Decodificar el token con JWT
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        } catch (error) {
            console.error('❌ Error al verificar token:', error);
            return sendResponse(res, 401, null, 'Token inválido o expirado');
        }

        const email = decoded.email;

        if (!email) {
            console.error('❌ No se pudo extraer el email del token.');
            return sendResponse(res, 400, null, 'Token inválido');
        }

        // 🔹 Obtener el usuario desde la base de datos con `full_name`
        const userQuery = await pool.query(`SELECT email, full_name, perfil, is_verified FROM users WHERE email = $1`, [email]);

        if (userQuery.rows.length === 0) {
            console.error('❌ Usuario no encontrado en la base de datos.');
            return sendResponse(res, 404, null, 'Usuario no encontrado');
        }

        const user = userQuery.rows[0];

        console.log('🔹 Datos obtenidos desde la base de datos:', user); // 📌 Verifica si `full_name` está presente

        return sendResponse(res, 200, { 
            email: user.email, 
            full_name: user.full_name, // 🔹 Agregar `full_name` en la respuesta
            perfil: user.perfil, 
            is_verified: user.is_verified ?? false 
        }, 'Email obtenido correctamente');

    } catch (error) {
        console.error('❌ Error interno en /get-email-from-temp-token:', error);
        return sendResponse(res, 500, null, 'Error interno del servidor');
    }
}));



router.post('/refresh-token', authJWT, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user) {
        console.error('❌ Usuario no autenticado.');
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
    }

    // 🔹 Generar un nuevo token
    const newToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    res.json({ token: newToken });
}));


// 🔹 Ruta para crear perfil de usuario después del login con Google
router.post('/create-google-profile', authJWT, asyncHandler(async (req: Request, res: Response) => {
    await authController.createGoogleProfile(req, res);
}));

// 🔹 Ruta para verificar la cuenta
router.get('/verify/:token', asyncHandler(async (req: Request, res: Response) => {
    await authController.verifyAccount(req, res);
}));


// 🔹 Ruta para enviar correo de verificación
router.post('/send-verification-email', asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return sendResponse(res, 400, null, 'Email requerido');

    // 🔹 Buscar token existente
    const tokenRecord = await pool.query(
        'SELECT token FROM verification_tokens WHERE email = $1 AND expires_at > NOW() LIMIT 1',
        [email]
    );

    let verificationToken = tokenRecord.rows.length > 0 ? tokenRecord.rows[0].token : null;

    // 🔹 Si no hay un token válido, generar uno nuevo
    if (!verificationToken) {
        verificationToken = randomBytes(32).toString('hex');
        await pool.query(`
            INSERT INTO verification_tokens (email, token, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '24 hours')
            ON CONFLICT (email) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '24 hours'
        `, [email, verificationToken]);
        console.log(`✅ Nuevo token de verificación generado para ${email}: ${verificationToken}`);
    }

    // 🔹 Validar antes de enviar el email
    if (!verificationToken) {
        return sendResponse(res, 500, null, 'Error al generar el token de verificación');
    }

    console.log(`🔹 Enviando email de verificación a ${email} con token: ${verificationToken}`);

    await sendVerificationEmail(email, verificationToken);
    sendResponse(res, 200, null, 'Correo de verificación enviado');
}));



// 🔹 Ruta para guardar token de verificación
router.post('/save-verification-token', authJWT, asyncHandler(async (req: Request, res: Response) => {
    const { email, token } = req.body;
    if (!email || !token) return sendResponse(res, 400, null, 'Email y token son requeridos');

    await pool.query(`
        INSERT INTO verification_tokens (email, token, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '24 hours')
        ON CONFLICT (email) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '24 hours'
    `, [email, token]);

    sendResponse(res, 200, 'Token de verificación guardado');
}));

// 🔹 Ruta de prueba para verificar que las rutas funcionan correctamente
router.get('/', (req: Request, res: Response) => {
    sendResponse(res, 200, { message: 'Rutas de autenticación funcionando' });
});

export default router;
