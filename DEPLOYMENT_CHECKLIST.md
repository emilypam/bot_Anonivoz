# ✅ Checklist de Configuración - Tu Voz Segura Backend

## 📋 Pre-requisitos

- [ ] Node.js 18+ instalado
- [ ] npm o yarn disponible
- [ ] Git configurado
- [ ] Acceso a Nhost (PostgreSQL)
- [ ] Token de Telegram del bot

## 🛠️ Configuración Local

### Paso 1: Instalación de Dependencias
- [ ] Ejecutar: `npm install`
- [ ] Verificar: `npm --version` (debería ser v8+)

### Paso 2: Variables de Entorno
- [ ] Copiar `.env.example` → `.env.local`
- [ ] Llenar `DATABASE_URL` con URI de Nhost
- [ ] Llenar `TELEGRAM_BOT_TOKEN` con token del bot
- [ ] Verificar que `.env.local` NO está en git (revisar `.gitignore`)

### Paso 3: Configuración de Prisma
- [ ] Ejecutar: `npm run prisma:generate`
- [ ] Ejecutar: `npm run prisma:push` (sincronizar BD)
- [ ] Verificar en Nhost que tabla `Report` existe

### Paso 4: Pruebas Locales
- [ ] Ejecutar: `npm run start:dev`
- [ ] Verificar que API está en `http://localhost:3000`
- [ ] Probar endpoint: `GET http://localhost:3000/api/reports`

### Paso 5: Pruebas del Bot (Opcional Local)
- [ ] Cambiar `NODE_ENV=development` en `.env.local`
- [ ] El bot usará polling en local (no webhooks)
- [ ] Enviar `/start` al bot de Telegram
- [ ] Completar flujo de reporte

## 🚀 Despliegue en Vercel

### Paso 1: Preparar Repositorio
- [ ] Inicializar git: `git init`
- [ ] Agregar archivos: `git add .`
- [ ] Primer commit: `git commit -m "Initial commit"`
- [ ] Crear repo en GitHub

### Paso 2: Conectar a Vercel
- [ ] Ir a vercel.com
- [ ] Conectar GitHub
- [ ] Seleccionar repositorio
- [ ] Vercel detectará `package.json` y `vercel.json`

### Paso 3: Variables de Entorno en Vercel
- [ ] Settings → Environment Variables
- [ ] Agregar `DATABASE_URL`
- [ ] Agregar `TELEGRAM_BOT_TOKEN`
- [ ] Agregar `WEBHOOK_URL` (formato: `https://tu-proyecto.vercel.app/bot/webhook`)
- [ ] Agregar `NODE_ENV=production`

### Paso 4: Deploy
- [ ] Deploy automático desde main: `git push`
- [ ] Verificar logs en Vercel Dashboard
- [ ] Anotar URL pública: `https://tu-proyecto.vercel.app`

### Paso 5: Configurar Webhook de Telegram
- [ ] Ejecutar comando curl desde Terminal:
```bash
curl -X POST https://api.telegram.org/bot{TU_TOKEN}/setWebhook \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://tu-proyecto.vercel.app/bot/webhook",
    "drop_pending_updates": true
  }'
```
- [ ] Verificar: 
```bash
curl https://api.telegram.org/bot{TU_TOKEN}/getWebhookInfo
```

### Paso 6: Verificar Funcionalidad
- [ ] Enviar `/start` al bot en Telegram
- [ ] Iniciar reporte con `/report`
- [ ] Completar todos los pasos del wizard
- [ ] Verificar que se guardó en BD (en Nhost)

## 📊 Validación Final

### Base de Datos
- [ ] Conectar a Nhost y ver tabla `Report`
- [ ] Verificar que hay al menos un reporte guardado
- [ ] Ejecutar query de estadísticas: `GET /api/reports/stats`

### API
- [ ] `GET /api/reports` devuelve lista de reportes
- [ ] `GET /api/reports/:id` devuelve un reporte específico
- [ ] `GET /api/reports/stats` devuelve estadísticas

### Bot
- [ ] Responde a `/start`
- [ ] Responde a `/report`
- [ ] Wizard completo guarda datos
- [ ] Sin errores en logs de Vercel

## 🔒 Seguridad

- [ ] `.env.local` no está commiteado
- [ ] Secrets en Vercel están protegidos
- [ ] Base de datos tiene acceso limitado
- [ ] Webhook URL está HTTPS
- [ ] Token de Telegram no en repo público

## 📞 Troubleshooting

### Problema: "Error connecting to database"
- [ ] Verificar `DATABASE_URL` en `.env.local`
- [ ] Verificar que Nhost está online
- [ ] Conectar desde herramientas externas (DBeaver, psql)

### Problema: "Bot no responde"
- [ ] Verificar `TELEGRAM_BOT_TOKEN` correcto
- [ ] Ver logs en Vercel: `vercel logs --follow`
- [ ] Webhook URL en `getWebhookInfo` correcta

### Problema: "Reporte no se guarda"
- [ ] Revisar logs de Vercel
- [ ] Verificar Prisma schema está actualizado
- [ ] Ejecutar `npm run prisma:push` nuevamente

## 📝 Notas

- Este checklist se puede repetir para actualizaciones futuras
- Mantén credenciales en `.env.local` nunca en código
- Usa `npm run start:prod` para simular producción localmente
- Revisa logs regularmente en producción

---

**Estado**: ✅ Listo para producción
**Última actualización**: 2026-05-06
**Responsable**: Equipo de Desarrollo
