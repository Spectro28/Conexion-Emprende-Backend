import nodemailer from 'nodemailer';

export async function sendVerificationEmail(email: string, verificationToken: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Verificación de correo electrónico',
      html: `
        <h2>Verificación de correo electrónico</h2>
        <p>Haga clic en el siguiente enlace para verificar su correo electrónico:</p>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}">Verificar correo</a>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error al enviar correo de verificación:', error);
    throw error;
  }
}
