#!/bin/bash

echo "🚀 Instalando Tu Voz Segura Backend..."

# Install dependencies
echo "📦 Instalando dependencias npm..."
npm install

# Generate Prisma client
echo "🔧 Generando cliente Prisma..."
npm run prisma:generate

# Create .env.local if doesn't exist
if [ ! -f .env.local ]; then
  echo "📝 Creando archivo .env.local..."
  cp .env.example .env.local
  echo "⚠️  Configura las variables en .env.local antes de iniciar el servidor"
fi

echo "✅ Setup completado!"
echo ""
echo "Próximos pasos:"
echo "1. Configura .env.local con tus credenciales"
echo "2. Ejecuta: npm run prisma:push (para sincronizar la BD)"
echo "3. Ejecuta: npm run start:dev (para iniciar en desarrollo)"
