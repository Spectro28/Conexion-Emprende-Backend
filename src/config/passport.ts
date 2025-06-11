import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { pool } from '../config/database';

// 🔹 Configurar estrategia Google OAuth
export const googleStrategy = new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: 'http://localhost:3003/auth/google/callback/'
}, async (accessToken: string, refreshToken: string, profile: Profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        const displayName = profile.displayName;

        if (!email || !displayName) {
            return done(new Error('Datos de usuario inválidos'));
        }

        console.log('🔹 Autenticación con Google: Email obtenido:', email);

        const userQuery = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);

        if (userQuery.rowCount === 0) {
            console.log('🔹 Usuario no registrado, creando nuevo usuario...');
            const newUser = await pool.query(
                `INSERT INTO users (full_name, email, is_verified) VALUES ($1, $2, FALSE) RETURNING *`,
                [displayName, email]
            );
            return done(null, { ...newUser.rows[0], redirectTo: '/profile-selection' });
        }

        const existingUser = userQuery.rows[0];

        let redirectTo = '/profile-selection';

        // 🔹 Asegurar que el perfil existe antes de redirigir
        if (existingUser.perfil) {
            const redirectTo = existingUser.perfil ? `/${existingUser.perfil}` : '/profile-selection';
console.log('🔹 Redirigiendo a:', redirectTo);
return done(null, { ...existingUser, redirectTo });

        } else {
            console.log('🔹 Usuario sin perfil, redirigiendo a selección de perfil.');
        }

        return done(null, { ...existingUser, redirectTo });
    } catch (error) {
        console.error('❌ Error en Google OAuth:', error);
        return done(error);
    }
});

passport.use(googleStrategy);

// 🔹 Configurar estrategia JWT
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET!
}, async (jwtPayload, done) => {
    try {
        console.log('🔹 Autenticación con JWT:', jwtPayload.email);
        const userQuery = await pool.query(`SELECT id, email, perfil, is_verified FROM users WHERE email = $1`, [jwtPayload.email]);

        if (userQuery.rowCount === 0) {
            return done(null, false);
        }

        return done(null, userQuery.rows[0]);
    } catch (error) {
        console.error('❌ Error en JWT:', error);
        return done(error, false);
    }
}));

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
    try {
        console.log('🔹 Deserializando usuario con ID:', id);
        const userQuery = await pool.query(`SELECT id, email, perfil FROM users WHERE id = $1`, [id]);

        if (userQuery.rowCount === 0) {
            return done(new Error('Usuario no encontrado'));
        }
        
        done(null, userQuery.rows[0]);
    } catch (error) {
        console.error('❌ Error al deserializar usuario:', error);
        done(error);
    }
});

export default passport;
