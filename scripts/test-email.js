require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Prueba — Ecu Gaming Import</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a12;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0a0a12;">
  <tr><td style="padding:24px 16px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"
      style="margin:auto;max-width:580px;width:100%;border-radius:16px;overflow:hidden;border:1px solid #1e1e30;background-color:#12121f;">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#9333ea 100%);padding:36px 40px;text-align:center;">
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">&#127918; Ecu Gaming Import</p>
          <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.80);letter-spacing:0.3px;">CORREO DE PRUEBA</p>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="background:#12121f;padding:36px 40px;">
          <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#c4c4d4;line-height:1.7;">
            &#9989; <strong style="color:#4ade80;">Conexi&#243;n exitosa con Proton Mail.</strong>
          </p>
          <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#8888a0;line-height:1.7;">
            Este es un correo de prueba desde <strong style="color:#a78bfa;">Ecu Gaming Import</strong> usando el servidor SMTP de Proton Mail con cifrado STARTTLS.
          </p>

          <!-- Info card -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
            <tr>
              <td style="background:#0e0e1a;border:1px solid #2a2a3e;border-radius:12px;padding:20px;">
                <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:#6b6b80;text-transform:uppercase;letter-spacing:1px;">Configuraci&#243;n activa</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#6b6b80;padding:5px 0;border-bottom:1px solid #1e1e30;">Servidor</td>
                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#e2e2ee;text-align:right;padding:5px 0;border-bottom:1px solid #1e1e30;">smtp.protonmail.ch</td>
                  </tr>
                  <tr>
                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#6b6b80;padding:5px 0;border-bottom:1px solid #1e1e30;">Puerto</td>
                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#e2e2ee;text-align:right;padding:5px 0;border-bottom:1px solid #1e1e30;">587 STARTTLS</td>
                  </tr>
                  <tr>
                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#6b6b80;padding:5px 0;">Remitente</td>
                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#e2e2ee;text-align:right;padding:5px 0;">soporte@ecugamingimport.top</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#44445a;text-align:center;">
            &#128274; Comunicaci&#243;n segura y cifrada
          </p>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#0a0a12;padding:18px 40px;text-align:center;border-top:1px solid #1e1e30;">
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#33333f;">&#169; 2025 Ecu Gaming Import &#183; Ecuador</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

async function send() {
  console.log('Conectando a Proton SMTP...');
  try {
    await transporter.verify();
    console.log('✅ Conexión verificada');

    const info = await transporter.sendMail({
      from: `"Ecu Gaming Import" <${process.env.SMTP_FROM}>`,
      to: 'ecugamingimport@gmail.com',
      subject: '✅ Prueba de correo — Ecu Gaming Import',
      html,
      headers: {
        'X-Mailer': 'Mailer/2.0',
        'Precedence': 'bulk',
        'Auto-Submitted': 'auto-generated',
      },
    });

    console.log('✅ Correo enviado:', info.messageId);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

send();
