import nodemailer from 'nodemailer';

// Configurar el transporte de correo
export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Envía un correo con el contenido especificado.
 * @param to - Dirección de correo del destinatario.
 * @param subject - Asunto del correo.
 * @param message - Contenido HTML del correo.
 * @returns Promise con el resultado del envío.
 */
export const sendEmail = async (recipient: string, subject: string, content: string): Promise<boolean> => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: recipient,
            subject,
            html: content
        });

        console.log(`✅ Correo enviado con ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        return false;
    }
};

console.log('🔹 Configuración actual del servidor SMTP:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER
});

/**
 * Envía un correo de verificación.
 * @param email - Dirección de correo del usuario.
 * @param verificationToken - Token de verificación.
 * @returns Promise<boolean> indicando si el envío fue exitoso.
 */


export const sendVerificationEmail = async (email: string, verificationToken: string): Promise<boolean> => {
    try {
        console.log(`🔹 Intentando enviar correo a: ${email} con token: ${verificationToken}`);

        if (!verificationToken) {
            console.error('❌ Error: Token inválido.');
            return false;
        }

        const verificationUrl = `${process.env.FRONTEND_URL}/email-verification?token=${verificationToken}`;
        console.log(`🔹 Enlace de verificación generado: ${verificationUrl}`);

        const message = `
            <h2>Verificación de correo electrónico</h2>
            <p>Haz clic en el siguiente enlace para verificar tu correo:</p>
            <a href="${verificationUrl}">Verificar correo</a>
            <p>Este enlace expirará en 24 horas.</p>
        `;

        const emailSent = await sendEmail(email, 'Verificación de correo electrónico', message);

        console.log(`✅ Estado del envío: ${emailSent} (Debe ser true o false)`);

        return Boolean(emailSent); // 🔹 Forzar retorno `boolean` en caso de valores inesperados
    } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        return false;
    }
};








