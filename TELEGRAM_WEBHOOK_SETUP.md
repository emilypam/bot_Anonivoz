# Configuración de Webhook de Telegram en Vercel

## Paso 1: Deployar en Vercel

```bash
vercel deploy
```

Anota la URL pública: `https://your-project.vercel.app`

## Paso 2: Configurar Variables de Entorno en Vercel Dashboard

Accede a: `vercel.com` → Tu Proyecto → Settings → Environment Variables

Añade:
- `DATABASE_URL`: La URI de PostgreSQL
- `TELEGRAM_BOT_TOKEN`: El token del bot
- `WEBHOOK_URL`: `https://your-project.vercel.app/bot/webhook`
- `NODE_ENV`: `production`

## Paso 3: Redeployar

```bash
vercel deploy --prod
```

## Paso 4: Configurar Webhook en Telegram

Ejecuta este comando curl (reemplaza `YOUR_BOT_TOKEN` y la URL):

```bash
curl -X POST https://api.telegram.org/bot8754690841:AAGlhutFatsrKVjozlMG6KVju12G1lCsaQg/setWebhook \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://your-project.vercel.app/bot/webhook",
    "drop_pending_updates": true,
    "allowed_updates": ["message", "callback_query"]
  }'
```

## Paso 5: Verificar Webhook

```bash
curl https://api.telegram.org/bot8754690841:AAGlhutFatsrKVjozlMG6KVju12G1lCsaQg/getWebhookInfo
```

Deberías ver:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-project.vercel.app/bot/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "...",
    "last_error_date": 0,
    "last_error_message": "..."
  }
}
```

## Troubleshooting

### Webhook no recibe updates

1. Verifica que la URL es correcta y accesible desde internet
2. Verifica que el token es correcto
3. Revisa logs de Vercel: `vercel logs --follow`
4. Reinicia el webhook: `setWebhook` sin parámetros, luego vuelve a configurar

### Error 500 en webhook

1. Verifica que todas las env vars están configuradas
2. Revisa la conexión a la base de datos
3. Mira los logs de Vercel para el error exacto

### Respuesta lenta del webhook

Vercel tiene timeout de 60s para funciones. Si la lógica tarda más, necesitas procesamiento asincrónico con colas.
