# Publicar data.insights gratis (para probar online)

Usaremos dos servicios con plan gratuito:

- **Neon**: la base de datos PostgreSQL en internet.
- **Vercel**: la aplicación web. Te da una dirección tipo `https://tu-proyecto.vercel.app`.

No necesitas dominio propio ni tarjeta de crédito.

---

## 0. Antes de empezar

1. Tu código debe estar en GitHub, en un repositorio de **tu cuenta personal** (no de una organización).
2. En tu computadora, dentro de la carpeta del proyecto, comprueba que el código compila. Vercel hace esta misma comprobación y, si falla, no publica:

```
npm install
npm run typecheck
npm run build
```

Si alguno muestra errores en rojo, cópiamelos y los corrijo antes de seguir.

---

## 1. Crear la base de datos en Neon

1. Entra a **https://neon.com**, pulsa *Sign up* y regístrate con tu cuenta de GitHub.
2. Crea un proyecto nuevo. Nombre: `data-insights`. En *Region* elige **AWS US East (N. Virginia)**, la misma zona que usa Vercel por defecto, para que sea rápido.
3. Cuando se cree, pulsa el botón **Connect**. Activa la opción **Connection pooling** y copia la cadena de conexión. Se ve así:

```
postgresql://usuario:clave@ep-xxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Guárdala en un lugar seguro: es la llave de tu base de datos. No la compartas ni la subas a GitHub.

4. En el menú de Neon abre **SQL Editor**. Abre en VS Code el archivo `db/schema.sql`, copia **todo** su contenido, pégalo en el editor de Neon y pulsa **Run**. Esto crea todas las tablas.

   Comprueba que se crearon ejecutando esta consulta; debe listar tablas como `users`, `workspaces`, `records`:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

Esta base de datos está vacía y es **independiente de la de tu computadora**: tus datos de prueba locales no se copian.

---

## 2. Publicar la app en Vercel

1. Entra a **https://vercel.com**, pulsa *Sign up*, elige el plan **Hobby** e inicia sesión con GitHub.
2. Pulsa **Add New → Project** y elige tu repositorio `Analisis-de-datos` (si no aparece, autoriza a Vercel a ver tus repositorios).
3. Vercel detecta Next.js solo. Antes de pulsar *Deploy*, abre **Environment Variables** y añade estas dos:

| Nombre | Valor |
|---|---|
| `DATABASE_URL` | la cadena de conexión de Neon del paso 1 |
| `SESSION_SECRET` | un texto largo y aleatorio (por ejemplo, 40 letras y números al azar) |

4. Pulsa **Deploy**. Tarda de 1 a 3 minutos. Al terminar, Vercel muestra tu dirección pública.
5. Ábrela, crea una cuenta y comprueba que entras al resumen.

---

## 3. Actualizar la app más adelante

Cada vez que subas cambios a GitHub (*Commit* y *Sync Changes* en VS Code), Vercel publica la nueva versión automáticamente.

Si un cambio modifica la base de datos, ejecuta el archivo nuevo de `db/migrations` en el **SQL Editor** de Neon, igual que hiciste con `schema.sql`.

---

## 4. Límites del plan gratuito (importante)

- **Vercel Hobby es para uso personal y no comercial.** Sirve para probar; para un negocio real necesitarás un plan de pago.
- **Neon gratis** ofrece 0,5 GB de almacenamiento y 100 horas de cómputo al mes por proyecto. La base de datos se **duerme tras 5 minutos sin uso**: la primera visita después de un rato tarda unos segundos más en cargar. Es normal.
- **Los archivos importados pueden pesar hasta 4 MB.** Vercel limita cada petición a 4,5 MB.
- Si te pasas de los límites gratuitos, el proyecto se pausa; no te cobran.
- **No se envían correos.** Las invitaciones se comparten copiando el enlace, y los mensajes del formulario de contacto quedan guardados en la tabla `contact_messages`.
- **Datos personales:** la app guarda nombres, correos y teléfonos. Antes de abrirla a personas reales, publica una política de privacidad y pide su consentimiento según la ley de tu país. Mientras pruebas, usa datos ficticios.

---

## 5. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El *build* falla en Vercel | Ejecuta `npm run build` en tu computadora y envíame el error. |
| Error 500 al registrarte o entrar | `DATABASE_URL` mal copiada (debe terminar en `?sslmode=require`) o no ejecutaste `schema.sql` en Neon. |
| `relation "users" does not exist` | Falta ejecutar `db/schema.sql` en el SQL Editor de Neon. |
| La primera carga tarda varios segundos | Es la base de datos despertando. Recarga. |
| No sube un archivo | Pesa más de 4 MB. |
