# Tu Voz Segura - Backend

Backend NestJS para el bot de Telegram "Tu Voz Segura" - Sistema de reporte anónimo de acoso.

## 🔧 Stack Técnico

- **Framework**: NestJS
- **Bot**: Telegraf
- **Base de Datos**: PostgreSQL (Nhost)
- **ORM**: Prisma
- **Despliegue**: Vercel (Serverless Functions)

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- PostgreSQL 12+

## 🚀 Instalación Local

1. **Clonar el repositorio y instalar dependencias**

```bash
npm install
```

2. **Configurar variables de entorno**

Crear archivo `.env.local` con:

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
TELEGRAM_BOT_TOKEN="your_bot_token"
WEBHOOK_URL="https://yourdomain.vercel.app/bot/webhook"
NODE_ENV="development"
PORT=3000
```

3. **Ejecutar migraciones de Prisma**

```bash
npm run prisma:push
```

4. **Generar cliente Prisma**

```bash
npm run prisma:generate
```

5. **Iniciar el servidor en desarrollo**

```bash
npm run start:dev
```

## 📝 Estructura del Proyecto

```
src/
├── main.ts                 # Punto de entrada
├── app.module.ts           # Módulo principal
├── bot/                    # Módulo del bot de Telegram
│   ├── bot.service.ts      # Lógica del WizardScene
│   ├── bot.controller.ts   # Webhook endpoint
│   └── bot.module.ts       # Definición del módulo
├── report/                 # Módulo de reportes
│   ├── report.service.ts   # Lógica de negocio
│   ├── report.controller.ts # Endpoints de la API
│   ├── report.module.ts    # Definición del módulo
│   └── dto/                # Data Transfer Objects
└── prisma/                 # Servicio de Prisma
    ├── prisma.service.ts
    └── prisma.module.ts

prisma/
└── schema.prisma           # Schema de la base de datos
```

## 🤖 Flujo del Bot

El bot implementa un **WizardScene** que guía al usuario a través de 6 pasos:

1. **Rol del informante** - ¿Eres víctima o testigo?
2. **Tipo de acoso** - Selecciona la categoría (Físico, Verbal, Social, Ciberacoso)
3. **Frecuencia** - ¿Con qué frecuencia ocurre?
4. **Ubicación** - ¿Dónde sucede?
5. **Evidencia** - Adjunta foto/screenshot (opcional)
6. **Descripción** - Narración libre del incidente

Al finalizar, los datos se guardan en PostgreSQL.

## 📡 Endpoints de la API

### Reportes

- `POST /api/reports` - Crear nuevo reporte
- `GET /api/reports` - Listar reportes (con paginación)
- `GET /api/reports/:id` - Obtener reporte específico
- `GET /api/reports/stats` - Estadísticas de reportes

### Bot

- `POST /bot/webhook` - Webhook de Telegram

## 🔐 Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URI de conexión a PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |
| `WEBHOOK_URL` | URL pública para webhook | `https://example.vercel.app/bot/webhook` |
| `NODE_ENV` | Entorno de ejecución | `development` o `production` |
| `PORT` | Puerto de escucha | `3000` |

## 📦 Comandos Disponibles

```bash
# Desarrollo
npm run start:dev        # Iniciar con hot-reload
npm run start:debug      # Iniciar en modo debug

# Producción
npm run build           # Compilar TypeScript
npm run start:prod      # Ejecutar en producción

# Base de datos
npm run prisma:push     # Sincronizar schema con BD
npm run prisma:migrate  # Crear nueva migración
npm run prisma:studio   # Abrir Prisma Studio

# Linting
npm run lint            # Ejecutar ESLint
npm run format          # Formatear código
```

## 🌐 Despliegue en Vercel

1. Conectar repositorio a Vercel
2. Variables de entorno en Vercel Dashboard:
   - `DATABASE_URL`
   - `TELEGRAM_BOT_TOKEN`
   - `WEBHOOK_URL`

3. Configurar webhook de Telegram hacia la URL de Vercel

```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://yourdomain.vercel.app/bot/webhook"}'
```

4. Deploy automático en push a main

## 🧪 Testing

```bash
npm run test            # Ejecutar tests
npm run test:watch      # Tests en watch mode
npm run test:cov        # Coverage report
```

## 📊 Base de Datos

### Tabla Report

```sql
CREATE TABLE Report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  informantType VARCHAR(50),
  harassmentType VARCHAR(100),
  frequencyLevel VARCHAR(50),
  locationTag VARCHAR(100),
  evidenceUrl VARCHAR(500) NULL,
  descriptionText TEXT,
  telegramUserId VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔍 Monitoreo

- Dashboard en Vercel para logs
- Logs de Prisma en `DEBUG=prisma:*`
- Logs del bot en stdout

## 📞 Soporte

Para reportar issues o sugerencias, contacta al equipo de desarrollo.

---

**Desarrollado por**: Tu Voz Segura Team
**Última actualización**: 2026-05-06
