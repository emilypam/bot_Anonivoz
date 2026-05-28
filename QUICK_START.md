# 🚀 Quick Start - Tu Voz Segura Backend

## En 5 Minutos

### 1. Instalar Dependencias
```bash
npm install
npm run prisma:generate
```

### 2. Configurar Credenciales
```bash
# Crear .env.local y llenar:
# DATABASE_URL=postgresql://...
# TELEGRAM_BOT_TOKEN=...
# WEBHOOK_URL=https://...
```

### 3. Sincronizar Base de Datos
```bash
npm run prisma:push
```

### 4. Iniciar Servidor
```bash
npm run start:dev
```

### 5. Probar en Telegram
- Envía `/start` al bot
- Ejecuta `/report`
- Sigue el flujo de preguntas

---

## 🏗️ Estructura del Proyecto

```
tu-voz-segura/
├── src/
│   ├── main.ts                    ← Punto de entrada
│   ├── app.module.ts              ← Módulo principal
│   │
│   ├── bot/                       ← Módulo del bot
│   │   ├── bot.service.ts         ← Lógica del WizardScene (flujo de preguntas)
│   │   ├── bot.controller.ts      ← Endpoint de webhook (/bot/webhook)
│   │   └── bot.module.ts          ← Definición del módulo
│   │
│   ├── report/                    ← Módulo de reportes
│   │   ├── report.service.ts      ← Lógica de persistencia
│   │   ├── report.controller.ts   ← Endpoints API (/api/reports)
│   │   ├── report.module.ts       ← Definición del módulo
│   │   └── dto/
│   │       └── create-report.dto.ts ← Validación de datos
│   │
│   └── prisma/                    ← Servicio de BD
│       ├── prisma.service.ts      ← Cliente de Prisma
│       └── prisma.module.ts       ← Definición del módulo
│
├── prisma/
│   └── schema.prisma              ← Esquema de BD (tabla Report)
│
├── 📄 Documentación
│   ├── README.md                  ← Overview del proyecto
│   ├── DEPLOYMENT_CHECKLIST.md    ← Pasos para desplegar
│   ├── DOCKER_DEV_SETUP.md        ← Setup local con Docker
│   ├── TELEGRAM_WEBHOOK_SETUP.md  ← Configuración del webhook
│   └── PRISMA_SETUP.md            ← Comandos de Prisma
│
├── 🔧 Configuración
│   ├── package.json               ← Dependencias
│   ├── tsconfig.json              ← TypeScript
│   ├── jest.config.js             ← Tests
│   ├── .eslintrc.json             ← Linting
│   ├── .prettierrc                ← Formateo
│   ├── vercel.json                ← Vercel deployment
│   ├── nest-cli.json              ← NestJS CLI
│   ├── docker-compose.yml         ← PostgreSQL local
│   └── .env.example               ← Plantilla de variables
│
└── 📜 Scripts
    └── install-deps.sh            ← Setup inicial
```

---

## 🔄 Flujo de Datos

```
Usuario de Telegram
    ↓
/report o callback
    ↓
bot.controller.ts (POST /bot/webhook)
    ↓
bot.service.ts (WizardScene con 6 pasos)
    ├─ Paso 1: Rol (Víctima/Testigo)
    ├─ Paso 2: Tipo (Físico/Verbal/Social/Ciberacoso)
    ├─ Paso 3: Frecuencia (Una vez/Semanal/Diario)
    ├─ Paso 4: Ubicación (Clase/Recreo/Redes Sociales/Fuera)
    ├─ Paso 5: Evidencia (Foto/URL opcional)
    └─ Paso 6: Descripción (Texto libre)
    ↓
report.service.ts (crear reporte)
    ↓
prisma.service.ts (Prisma Client)
    ↓
PostgreSQL (tabla Report)
    ↓
✅ Confirmación al usuario
```

---

## 🛠️ Tareas Principales Implementadas

### ✅ 1. Configuración de Prisma
- [x] Schema con tabla `Report`
- [x] Campos: id, informant_type, harassment_type, frequency_level, location_tag, evidence_url, description_text, telegramUserId, createdAt
- [x] Índices para queries rápidas

### ✅ 2. Lógica del Bot (NestJS + Telegraf)
- [x] WizardScene con 6 pasos
- [x] Guardado de datos en PostgreSQL
- [x] Confirmación al usuario
- [x] Manejo de errores

### ✅ 3. Adaptación para Vercel
- [x] Webhooks en lugar de polling
- [x] vercel.json configurado
- [x] main.ts setup para serverless
- [x] Guía de deployment

### ✅ 4. API REST
- [x] POST /api/reports - Crear reporte
- [x] GET /api/reports - Listar reportes
- [x] GET /api/reports/:id - Obtener uno
- [x] GET /api/reports/stats - Estadísticas

---

## 📦 Comandos Disponibles

```bash
# Desarrollo
npm run start:dev              # Iniciar con hot-reload
npm run start:debug           # Debug mode
npm run build                 # Compilar

# Base de Datos
npm run prisma:push           # Sincronizar schema
npm run prisma:migrate        # Nueva migración
npm run prisma:generate       # Generar cliente
npm run prisma:studio         # GUI de Prisma

# Calidad de Código
npm run lint                  # ESLint
npm run format                # Prettier
npm run test                  # Jest

# Producción
npm run build                 # Compilar
npm run start:prod            # Ejecutar compilado
```

---

## 🌐 Endpoints de la API

### Reportes
```
POST   /api/reports                 Crear nuevo reporte
GET    /api/reports                 Listar reportes (con paginación)
GET    /api/reports/:id             Obtener reporte por ID
GET    /api/reports/stats           Ver estadísticas
```

### Bot
```
POST   /bot/webhook                 Recibir updates de Telegram
```

---

## 🔐 Variables de Entorno Necesarias

```env
# Base de Datos (Nhost)
DATABASE_URL=postgresql://postgres:Postgres12345@yihgkkrveccxmxzpqdlq.db.sa-east-1.nhost.run:5432/yihgkkrveccxmxzpqdlq

# Telegram
TELEGRAM_BOT_TOKEN=8754690841:AAGlhutFatsrKVjozlMG6KVju12G1lCsaQg

# Webhook
WEBHOOK_URL=https://tu-proyecto.vercel.app/bot/webhook

# Entorno
NODE_ENV=development
PORT=3000
```

---

## 🚀 Próximos Pasos

1. **Local**
   ```bash
   npm install
   npm run prisma:generate
   npm run start:dev
   ```

2. **Pruebas**
   - Envía `/start` al bot
   - Prueba `/report`

3. **Deployment**
   - Sigue: `DEPLOYMENT_CHECKLIST.md`
   - Configura webhook con: `TELEGRAM_WEBHOOK_SETUP.md`

4. **Monitoreo**
   - Logs en Vercel Dashboard
   - Estadísticas en `/api/reports/stats`

---

## 📚 Documentación Completa

- **README.md** - Overview completo
- **DEPLOYMENT_CHECKLIST.md** - Paso a paso para producción
- **DOCKER_DEV_SETUP.md** - Setup local con PostgreSQL
- **TELEGRAM_WEBHOOK_SETUP.md** - Configuración del webhook

---

**¡Listo para comenzar! 🎉**
