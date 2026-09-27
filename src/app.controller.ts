import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('delete-account')
  @Header('Content-Type', 'text/html; charset=utf-8')
  deleteAccount(): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eliminar cuenta — La Vida en Directo</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 60px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 1.8rem; margin-bottom: 8px; }
    h2 { font-size: 1.1rem; margin-top: 32px; color: #333; }
    p { color: #444; }
    ol { color: #444; padding-left: 20px; }
    li { margin-bottom: 8px; }
    .note { background: #f5f5f5; border-left: 4px solid #e53935; padding: 12px 16px; border-radius: 4px; margin-top: 32px; font-size: 0.9rem; color: #555; }
    a { color: #e53935; }
  </style>
</head>
<body>
  <h1>Eliminar cuenta</h1>
  <p><strong>La Vida en Directo</strong> — Instrucciones para eliminar tu cuenta y datos</p>

  <h2>Desde la app (recomendado)</h2>
  <ol>
    <li>Abre la app <strong>La Vida en Directo</strong></li>
    <li>Ve a tu <strong>Perfil</strong> (icono de persona, abajo a la derecha)</li>
    <li>Desplázate hasta el final y pulsa <strong>«Eliminar cuenta»</strong></li>
    <li>Confirma la acción en el diálogo que aparece</li>
  </ol>
  <p>Tu cuenta y todos tus datos (conciertos, fotos, amigos) se eliminarán de forma permanente e inmediata.</p>

  <h2>Por email</h2>
  <p>Si no puedes acceder a la app, envía un correo a <a href="mailto:ncovach@gmail.com">ncovach@gmail.com</a> con el asunto <strong>«Eliminar cuenta»</strong> indicando el email asociado a tu cuenta. Procesaremos la solicitud en un plazo máximo de 7 días.</p>

  <div class="note">
    <strong>Datos que se eliminan:</strong> nombre, email, foto de perfil, conciertos guardados, fotos subidas y conexión con Spotify.<br><br>
    <strong>Datos que se conservan:</strong> ninguno. La eliminación es completa e irreversible.
  </div>
</body>
</html>`;
  }

  @Get('privacy-policy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacyPolicy(): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Política de Privacidad — La Vida en Directo</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 760px; margin: 60px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 1.8rem; margin-bottom: 8px; }
    h2 { font-size: 1.2rem; margin-top: 32px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    h3 { font-size: 1rem; margin-top: 20px; color: #333; }
    p, li { color: #444; }
    ul, ol { padding-left: 20px; }
    li { margin-bottom: 6px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 0.92rem; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
    a { color: #e53935; }
    .meta { color: #777; font-size: 0.9rem; }
    hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .footer-note { font-style: italic; color: #777; font-size: 0.85rem; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Política de Privacidad — La Vida en Directo</h1>
  <p class="meta">Última actualización: 27 de septiembre de 2026 · Versión 1.0</p>

  <h2>1. Responsable del tratamiento</h2>
  <table>
    <tr><th>Nombre / Razón social</th><td>La Vida en Directo (Nicolás Covacha, desarrollador individual)</td></tr>
    <tr><th>Email de contacto</th><td><a href="mailto:ncovach@gmail.com">ncovach@gmail.com</a></td></tr>
    <tr><th>Email de privacidad</th><td><a href="mailto:ncovach@gmail.com">ncovach@gmail.com</a></td></tr>
  </table>

  <h2>2. ¿Qué datos recogemos y para qué?</h2>

  <h3>2.1 Datos de registro</h3>
  <table>
    <tr><th>Dato</th><th>Finalidad</th><th>Base legal</th></tr>
    <tr><td>Nombre</td><td>Identificación en la app</td><td>Ejecución del contrato (art. 6.1.b RGPD)</td></tr>
    <tr><td>Correo electrónico</td><td>Autenticación, recuperación de contraseña</td><td>Ejecución del contrato</td></tr>
    <tr><td>Contraseña (hashed con bcrypt)</td><td>Autenticación segura</td><td>Ejecución del contrato</td></tr>
  </table>

  <h3>2.2 Contenido generado por el usuario</h3>
  <table>
    <tr><th>Dato</th><th>Finalidad</th><th>Base legal</th></tr>
    <tr><td>Conciertos (artista, fecha, lugar, valoraciones)</td><td>Funcionalidad principal de la app</td><td>Ejecución del contrato</td></tr>
    <tr><td>Fotos de conciertos</td><td>Álbum personal de recuerdos</td><td>Ejecución del contrato</td></tr>
    <tr><td>Comentarios en conciertos de amigos</td><td>Función social</td><td>Ejecución del contrato</td></tr>
    <tr><td>Lista "quiero ir"</td><td>Recordatorio de próximos eventos</td><td>Ejecución del contrato</td></tr>
  </table>

  <h3>2.3 Datos sociales</h3>
  <table>
    <tr><th>Dato</th><th>Finalidad</th><th>Base legal</th></tr>
    <tr><td>Relaciones de amistad</td><td>Función social (feed de amigos, etiquetado)</td><td>Ejecución del contrato</td></tr>
    <tr><td>Etiquetados en conciertos y fotos</td><td>Compartir experiencias</td><td>Consentimiento del usuario etiquetado</td></tr>
  </table>

  <h3>2.4 Datos técnicos</h3>
  <table>
    <tr><th>Dato</th><th>Finalidad</th><th>Base legal</th></tr>
    <tr><td>Token FCM del dispositivo</td><td>Notificaciones push</td><td>Interés legítimo / consentimiento</td></tr>
    <tr><td>Dirección IP (logs de servidor)</td><td>Seguridad, detección de fraude</td><td>Interés legítimo (art. 6.1.f RGPD)</td></tr>
    <tr><td>Foto de perfil (avatar)</td><td>Identificación visual</td><td>Ejecución del contrato</td></tr>
  </table>

  <h2>3. ¿Con quién compartimos tus datos?</h2>
  <p>Trabajamos con los siguientes <strong>encargados del tratamiento</strong> (terceros que procesan datos en nuestro nombre):</p>
  <table>
    <tr><th>Proveedor</th><th>País</th><th>Servicio</th><th>Garantías</th></tr>
    <tr><td>Neon Tech</td><td>EE. UU.</td><td>Base de datos PostgreSQL</td><td>SCCs UE-EE.UU. + DPA</td></tr>
    <tr><td>Cloudinary</td><td>EE. UU.</td><td>Almacenamiento de imágenes</td><td>SCCs + DPA</td></tr>
    <tr><td>Render</td><td>EE. UU.</td><td>Servidor de aplicación</td><td>SCCs + DPA</td></tr>
    <tr><td>Google Firebase</td><td>EE. UU.</td><td>Notificaciones push (FCM)</td><td>SCCs + DPA</td></tr>
    <tr><td>Spotify AB</td><td>Suecia</td><td>Información de artistas (API pública)</td><td>No se transfieren datos de usuario</td></tr>
    <tr><td>Ticketmaster</td><td>EE. UU.</td><td>Recomendaciones de eventos (API pública)</td><td>No se transfieren datos de usuario</td></tr>
    <tr><td>Setlist.fm</td><td>—</td><td>Setlists de conciertos (API pública)</td><td>No se transfieren datos de usuario</td></tr>
  </table>
  <p>No vendemos tus datos a terceros ni los cedemos con fines publicitarios.</p>

  <h2>4. Transferencias internacionales de datos</h2>
  <p>Algunos proveedores están ubicados fuera del Espacio Económico Europeo (EE. UU.). Las transferencias se realizan con las garantías adecuadas establecidas en el art. 46 RGPD (Cláusulas Contractuales Estándar adoptadas por la Comisión Europea).</p>

  <h2>5. ¿Cuánto tiempo conservamos tus datos?</h2>
  <table>
    <tr><th>Tipo de dato</th><th>Plazo de conservación</th></tr>
    <tr><td>Datos de cuenta</td><td>Hasta que eliminas tu cuenta</td></tr>
    <tr><td>Conciertos y fotos</td><td>Hasta que eliminas tu cuenta</td></tr>
    <tr><td>Logs de servidor (IPs)</td><td>90 días</td></tr>
    <tr><td>Tokens FCM</td><td>Hasta que cierras sesión o desinstalas la app</td></tr>
    <tr><td>Datos tras eliminación de cuenta</td><td>30 días (copia de seguridad), luego borrado definitivo</td></tr>
  </table>

  <h2>6. Tus derechos</h2>
  <p>Bajo el RGPD y la LOPD-GDD tienes derecho a:</p>
  <ul>
    <li><strong>Acceso</strong>: saber qué datos tenemos sobre ti.</li>
    <li><strong>Rectificación</strong>: corregir datos inexactos.</li>
    <li><strong>Supresión</strong> ("derecho al olvido"): eliminar tus datos.</li>
    <li><strong>Limitación del tratamiento</strong>: restringir el uso de tus datos.</li>
    <li><strong>Portabilidad</strong>: recibir tus datos en formato estructurado.</li>
    <li><strong>Oposición</strong>: oponerte al tratamiento basado en interés legítimo.</li>
    <li><strong>Retirada del consentimiento</strong>: cuando el tratamiento se basa en él.</li>
  </ul>
  <p>Para ejercer cualquiera de estos derechos, escríbenos a <a href="mailto:ncovach@gmail.com">ncovach@gmail.com</a> indicando tu nombre, email de registro y el derecho que deseas ejercer. Responderemos en el plazo máximo de <strong>un mes</strong> (ampliable dos meses más en casos complejos).</p>
  <p>Si consideras que el tratamiento no es conforme al RGPD, puedes presentar una reclamación ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong>: <a href="https://www.aepd.es">https://www.aepd.es</a></p>

  <h2>7. Seguridad de los datos</h2>
  <p>Aplicamos medidas técnicas y organizativas adecuadas para proteger tus datos:</p>
  <ul>
    <li>Contraseñas almacenadas con <strong>bcrypt</strong> (hashing unidireccional, nunca en texto plano).</li>
    <li>Comunicaciones cifradas mediante <strong>HTTPS/TLS</strong>.</li>
    <li>Acceso a la base de datos restringido por roles y red privada.</li>
    <li>Tokens JWT con expiración de 7 días e invalidación automática tras cambio de contraseña.</li>
    <li>Cabeceras de seguridad HTTP (Helmet): CSP, HSTS, X-Frame-Options, etc.</li>
    <li>Límite de intentos de inicio de sesión (rate limiting) para prevenir ataques de fuerza bruta.</li>
  </ul>

  <h2>8. Menores de edad</h2>
  <p>Esta aplicación <strong>no está dirigida a menores de 14 años</strong> (edad mínima legal en España para dar consentimiento digital). Si eres menor de 14 años, necesitas el consentimiento de tu padre, madre o tutor/a legal para usar la app.</p>
  <p>Si detectamos que hemos recogido datos de un menor sin consentimiento parental, los eliminaremos de inmediato. Contacta con nosotros en <a href="mailto:ncovach@gmail.com">ncovach@gmail.com</a>.</p>

  <h2>9. Cookies y tecnologías de seguimiento</h2>
  <p>La aplicación móvil <strong>no utiliza cookies</strong>. El servidor puede registrar IPs temporalmente en logs de sistema por motivos de seguridad (ver sección 5).</p>

  <h2>10. Contenido de terceros</h2>
  <p>La app muestra datos de:</p>
  <ul>
    <li><strong>Spotify</strong>: información de artistas e información sobre sus canciones populares. Datos obtenidos mediante la API oficial de Spotify, sujetos a sus <a href="https://developer.spotify.com/terms">Términos de Uso</a>.</li>
    <li><strong>Ticketmaster</strong>: recomendaciones de eventos en vivo. Datos obtenidos mediante la API oficial, sujetos a sus <a href="https://developer.ticketmaster.com/support/terms-of-use/">Términos de Uso</a>.</li>
    <li><strong>Setlist.fm</strong>: setlists de conciertos. Datos obtenidos mediante la API oficial, sujetos a sus <a href="https://api.setlist.fm/docs/1.0/index.html">Términos de Uso</a>.</li>
  </ul>
  <p>Ninguna de estas integraciones transmite datos personales del usuario a dichos terceros.</p>

  <h2>11. Eliminación de cuenta</h2>
  <p>Puedes eliminar tu cuenta desde <strong>Ajustes → Eliminar cuenta</strong> en la app. La eliminación borra permanentemente tu perfil, conciertos, fotos, relaciones de amistad y notificaciones. El proceso es irreversible; tus datos se borran de forma definitiva tras el período de retención en copia de seguridad (30 días). Más detalle en <a href="/delete-account">/delete-account</a>.</p>

  <h2>12. Cambios en esta política</h2>
  <p>Si realizamos cambios materiales en esta política, te notificaremos mediante una notificación push o un aviso dentro de la app, con al menos <strong>15 días de antelación</strong> antes de que entren en vigor. El uso continuado de la app tras esa fecha implica la aceptación de los cambios.</p>

  <h2>13. Contacto</h2>
  <p>Para cualquier consulta sobre privacidad: 📧 <a href="mailto:ncovach@gmail.com">ncovach@gmail.com</a></p>

  <hr>
  <p class="footer-note">Esta política de privacidad se ha redactado conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPD-GDD).</p>
</body>
</html>`;
  }
}
