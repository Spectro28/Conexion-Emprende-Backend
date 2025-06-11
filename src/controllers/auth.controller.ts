import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import * as crypto from 'crypto';
import { pool } from '../config/database';
import { Request, Response } from 'express';
import { sendEmail } from '../services/email.service';
import { sendVerificationEmail as sendEmailService } from '../services/email.service';

interface User {
    id: number;
    email: string;
    full_name: string;
    perfil: string | null;
    is_verified: boolean;
}

interface AuthenticatedUser {
    id: number;
    email: string;
}

interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
}

// 🔹 Configurar estrategia Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: 'http://localhost:3003/auth/google/callback/'
}, async (accessToken: string, refreshToken: string, profile: Profile, done) => {
    try {
        console.log('🔹 Callback de Google OAuth recibido');
        const email = profile.emails?.[0]?.value;
        const fullName = profile.displayName; // 🔹 Asegurar que el nombre completo se extrae

        if (!email) {
            console.error('🔹 Error: No se obtuvo el email de Google');
            return done(new Error('No se obtuvo el email de Google'), undefined);
        }

        console.log('🔹 Email obtenido:', email);
        console.log('🔹 Nombre obtenido:', fullName); // 🔹 Verificar que se obtiene el nombre

        const userQuery = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);

        if (userQuery.rowCount === 0) {
            console.log('🔹 Nuevo usuario, creando registro temporal');
            const newUser = await pool.query(
                `INSERT INTO users (full_name, email, is_verified) VALUES ($1, $2, FALSE) RETURNING *`,
                [fullName, email]
            );
            return done(null, { ...newUser.rows[0], redirectTo: '/profile-selection' });
        }

        const existingUser = userQuery.rows[0];

        return done(null, { ...existingUser, redirectTo: existingUser.perfil ? `/${existingUser.perfil}` : '/profile-selection' });

    } catch (error) {
        console.error('🔹 Error en callback de Google OAuth:', error);
        return done(error);
    }
}));

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Verificar si el usuario existe
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userResult.rowCount === 0) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        const user = userResult.rows[0];

        // Verificar la contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        // Generar token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );

        // Enviar respuesta con el formato que espera el frontend
        res.status(200).json({
            status: 200,
            data: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                perfil: user.perfil,
                is_verified: user.is_verified,
                token: token
            },
            message: 'Login exitoso'
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { full_name, email, password } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if ((existingUser.rowCount ?? 0) > 0) {
            res.status(400).json({ error: 'El usuario ya existe' });
            return;
        }

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el usuario
        const result = await pool.query(
            'INSERT INTO users (full_name, email, password, is_verified) VALUES ($1, $2, $3, FALSE) RETURNING *',
            [full_name, email, hashedPassword]
        );

        // Generar token temporal
        const tempToken = jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        // Generar token de verificación
        const verificationToken = randomBytes(32).toString('hex');
        await pool.query(
            'INSERT INTO verification_tokens (token, email, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'24 hours\')',
            [verificationToken, email]
        );

        // Enviar correo de verificación
        await sendEmailService(email, verificationToken);

        res.status(200).json({
            status: 200,
            data: {
                token: tempToken,
                user: {
                    id: result.rows[0].id,
                    email: result.rows[0].email,
                    full_name: result.rows[0].full_name,
                    is_verified: false
                }
            },
            message: 'Usuario registrado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 🔹 Ruta para obtener email y perfil desde el token temporal
export const getEmailFromTempToken = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('🔹 Solicitud recibida en backend con token:', req.query.token); // 📌 Verificar si el frontend envía la solicitud correctamente

        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            console.error('❌ Token inválido o faltante en la solicitud.');
            res.status(400).json({ error: 'Token inválido o faltante' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };

        if (!decoded.email) {
            console.error('❌ Token inválido, no se obtuvo email.');
            res.status(400).json({ error: 'Token inválido' });
            return;
        }

        console.log('🔹 Email decodificado del token:', decoded.email);

        const userQuery = await pool.query(`SELECT email, full_name, perfil, is_verified FROM users WHERE email = $1`, [decoded.email]);

        if (userQuery.rows.length === 0) {
            console.error('❌ Usuario no encontrado en la base de datos.');
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        const user = userQuery.rows[0];

        console.log('🔹 Datos obtenidos desde la base de datos:', user); // 📌 Verificar si `full_name` está presente

        const responseData = {
            status: 200,
            data: { 
                email: user.email, 
                full_name: user.full_name, // 🔹 Asegurar que el backend envíe `full_name`
                perfil: user.perfil, 
                is_verified: user.is_verified ?? false 
            },
            message: 'Email y verificación obtenidos correctamente'
        };

        console.log('🔹 Respuesta enviada al frontend:', responseData); // 📌 Verificar qué datos realmente se envían al frontend

        res.json(responseData);
    } catch (error) {
        console.error('❌ Error al obtener email:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};





// 🔹 Ruta para crear perfil después de Google OAuth
export const createGoogleProfile = async (req: Request, res: Response) => {
    try {
        const { email, perfil, full_name } = req.body;

        console.log(`🔹 Recibido en backend:`, req.body);

        if (!email || !perfil || !full_name) {
            console.error('❌ Datos faltantes:', { email, perfil, full_name });
            return res.status(400).json({ error: 'Email, nombre completo y tipo de perfil requeridos' });
        }

        const client = await pool.connect();
        try {
            const existingUserQuery = await client.query('SELECT id FROM users WHERE email = $1', [email]);

            let updatedUser;
            if ((existingUserQuery.rowCount ?? 0) > 0) {
                console.log(`🔹 Usuario aún existe, actualizando perfil.`);
                updatedUser = await client.query(
                    'UPDATE users SET perfil = $1, full_name = $2 WHERE email = $3 RETURNING *',
                    [perfil, full_name, email]
                );
            } else {
                console.log(`🔹 Usuario NO existe, creándolo nuevamente.`);
                updatedUser = await client.query(
                    'INSERT INTO users (full_name, email, perfil, is_verified) VALUES ($1, $2, $3, FALSE) RETURNING *',
                    [full_name, email, perfil]
                );
            }

            console.log('✅ Usuario después de la actualización/creación:', updatedUser.rows[0]);

            // Modificar el formato de la respuesta para que coincida con lo que espera el frontend
            res.status(200).json({
                status: 200,
                data: {
                    perfil: updatedUser.rows[0].perfil,
                    full_name: updatedUser.rows[0].full_name,
                    email: updatedUser.rows[0].email,
                    is_verified: updatedUser.rows[0].is_verified
                },
                message: 'Perfil actualizado exitosamente'
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error al crear perfil:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 🔹 Ruta para verificar cuenta después de recibir el token de verificación
export const verifyAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.params;

        // 🔹 Decodificar el token para obtener el email
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };

        if (!decoded.email) {
            res.status(400).json({ error: 'Token inválido' });
            return;
        }

        const userQuery = await pool.query('SELECT id, perfil FROM users WHERE email = $1', [decoded.email]);

        if (userQuery.rowCount === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        // 🔹 Si el perfil es NULL, el usuario debe primero seleccionar un perfil
        if (!userQuery.rows[0].perfil) {
            console.error('❌ Error: Usuario sin perfil seleccionado.');
            res.status(400).json({ error: 'Debes seleccionar un perfil antes de verificar tu cuenta.' });
            return;
        }

        // 🔹 Actualizar `is_verified` a `TRUE`
        const updatedUser = await pool.query(
            'UPDATE users SET is_verified = TRUE WHERE id = $1 RETURNING is_verified',
            [userQuery.rows[0].id]
        );

        if (!updatedUser.rows[0].is_verified) {
            console.error('❌ No se pudo actualizar is_verified en la base de datos.');
            res.status(500).json({ error: 'No se pudo actualizar la verificación' });
            return;
        }

        console.log(`✅ Cuenta verificada para ${decoded.email}`);
        res.json({ status: 200, message: 'Cuenta verificada exitosamente' });
    } catch (error) {
        console.error('❌ Error al verificar cuenta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// 🔹 Ruta para actualizar perfil de usuario
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { perfil } = req.body;
        const user = req.user as User;

        if (!user) {
            res.status(401).json({ error: 'No hay usuario autenticado' });
            return;
        }

        if (!perfil) {
            res.status(400).json({ error: 'Perfil es requerido' });
            return;
        }

        const updatedUser = await pool.query(
            'UPDATE users SET perfil = $1 WHERE id = $2 RETURNING perfil',
            [perfil, user.id]
        );

        if (updatedUser.rowCount === 0) {
            res.status(500).json({ error: 'No se pudo actualizar el perfil' });
            return;
        }

        res.json({
            status: 200,
            data: { perfil: updatedUser.rows[0].perfil },
            message: 'Perfil actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error interno al actualizar perfil' });
    }
};
export const sendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email es requerido' });
            return;
        }

        const userQuery = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userQuery.rowCount === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

const verificationToken = crypto.randomBytes(32).toString('hex');

if (!verificationToken) {
    console.error('❌ Error: No se pudo generar el token de verificación.');
    res.status(500).json({ error: 'Error interno al generar el token de verificación' });
    return;
}

await pool.query('INSERT INTO verification_tokens (token, user_id) VALUES ($1, $2)', [verificationToken, userQuery.rows[0].id]);

console.log(`🔹 Token generado para ${email}: ${verificationToken}`);

try {
    await sendEmailService(email, verificationToken); // 👈 Llamando correctamente al servicio
    console.log(`✅ Correo de verificación enviado a ${email}`);
    res.json({ status: 200, message: 'Correo de verificación enviado' });
} catch (emailError: unknown) {
    console.error('❌ Error al enviar correo:', emailError);

    // 🔹 Convertir el error a tipo `Error` para acceder a su mensaje
    const errorMessage = emailError instanceof Error ? emailError.message : 'Error desconocido';

    res.status(500).json({ error: 'Error al enviar el correo de verificación', details: errorMessage });
}


    } catch (error) {
        console.error('❌ Error en `sendVerificationEmail`:', error);
        res.status(500).json({ error: 'Error interno al enviar el email' });
    }
};

