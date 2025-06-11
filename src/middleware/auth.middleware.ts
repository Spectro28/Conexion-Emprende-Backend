import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { User } from '../types/user';

export const authJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.error('❌ Token no proporcionado.');
            res.status(401).json({ error: 'Token no proporcionado' });
            return;
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            console.error('❌ Token inválido o mal formado.');
            res.status(401).json({ error: 'Token inválido o mal formado' });
            return;
        }

        let decoded: User;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as User;
        } catch (error) {
            console.error('❌ Token inválido o expirado:', error);
            res.status(401).json({ error: 'Token inválido o expirado' });
            return;
        }

        // 🔹 Recuperar usuario de la base de datos incluyendo `full_name`
        const { rows } = await pool.query(`SELECT id, full_name, email, perfil, is_verified FROM users WHERE email = $1`, [decoded.email]);

        if (rows.length === 0) {
            console.error('❌ Usuario no encontrado en la base de datos.');
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        console.log('🔹 Usuario autenticado:', rows[0]); // 📌 Verificar que `full_name` está presente

        req.user = rows[0] as User;
        next();
    } catch (error) {
        console.error('❌ Error en middleware JWT:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


export const isAuth = authJWT;
