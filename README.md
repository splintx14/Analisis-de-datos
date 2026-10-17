# Análisis de datos · data.insights

Aplicación web para cargar archivos Excel/CSV, normalizar los registros y consultar
el rendimiento del negocio en un espacio de trabajo compartido, con usuarios y roles.

**Stack:** Next.js (App Router) + TypeScript · PostgreSQL · Docker

## Requisitos

- [Node.js](https://nodejs.org) LTS
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Puesta en marcha

```bash
# 1. Configuración (cambia las claves dentro de .env)
cp .env.example .env          # Windows PowerShell: copy .env.example .env

# 2. Base de datos
docker compose up -d

# 3. Dependencias y servidor
npm install
npm run dev
```

Abre http://localhost:3000, crea una cuenta y entra a tu espacio.

Comprobar las tablas:

```bash
docker exec -it datainsights-db psql -U datainsights -d datainsights -c "\dt"
```

Empezar de cero (borra los datos locales):

```bash
docker compose down -v && docker compose up -d
```

## Roles

| Rol | Puede |
|---|---|
| Propietario | Todo, incluida facturación y eliminar el espacio |
| Administrador | Usuarios, roles, configuración, importaciones |
| Analista | Importar datos, crear y guardar reportes, exportar |
| Editor de datos | Subir y corregir registros |
| Lector | Solo ver dashboards y reportes |
| Invitado | Solo reportes compartidos con él |

## Seguridad

- Nunca subas el archivo `.env` a GitHub.
- Contraseñas con argon2id; los tokens de sesión se guardan solo como hash.
- Cookie de sesión `httpOnly`; bloqueo de 15 min tras 5 intentos fallidos.
- Los permisos se verifican en el servidor, no solo ocultando botones.

## Avance

1. Base del proyecto y base de datos ✅
2. Registro, login y sesiones ✅
3. Layout con menú agrupado según el rol
4. Roles, permisos e invitaciones
5. Importación de Excel/CSV con vista previa y validación
6. Dashboard con filtros y gráficos
7. Reportes guardados, exportación y registro de actividad
