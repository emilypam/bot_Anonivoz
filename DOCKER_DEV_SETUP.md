# Desarrollo Local con Docker Compose

## Inicio Rápido

### Opción 1: Base de Datos Local (Recomendado para desarrollo)

```bash
# Iniciar PostgreSQL y PgAdmin
docker-compose up -d

# Verificar que está corriendo
docker-compose ps

# Ver logs
docker-compose logs -f postgres
```

**Acceso:**
- PostgreSQL: `localhost:5432`
- PgAdmin: `http://localhost:5050` (admin@example.com / admin)

### Opción 2: Usar Nhost (Producción)

Si prefieres usar la BD de Nhost durante desarrollo:

```bash
# Asegúrate que .env.local contiene la URL de Nhost
DATABASE_URL="postgresql://postgres:Postgres12345@yihgkkrveccxmxzpqdlq.db.sa-east-1.nhost.run:5432/yihgkkrveccxmxzpqdlq"
```

## Comandos Útiles

### Iniciar servicios

```bash
docker-compose up -d          # En background
docker-compose up             # En foreground (ver logs)
```

### Detener servicios

```bash
docker-compose down           # Detiene y elimina contenedores
docker-compose down -v        # También elimina volúmenes (⚠️ pierde datos)
```

### Conectar a PostgreSQL

```bash
# Desde la terminal
docker-compose exec postgres psql -U postgres -d yihgkkrveccxmxzpqdlq

# Desde PgAdmin (web)
# 1. Ir a http://localhost:5050
# 2. Login: admin@example.com / admin
# 3. Add Server:
#    - Name: Tu Voz Segura
#    - Host: postgres
#    - Username: postgres
#    - Password: Postgres12345
```

### Resetear la base de datos

```bash
# Eliminar todo y comenzar de nuevo
docker-compose down -v
docker-compose up -d

# Luego sincronizar schema
npm run prisma:push
```

## Variables de Entorno para Docker

El `docker-compose.yml` ya tiene configuradas:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Postgres12345
POSTGRES_DB=yihgkkrveccxmxzpqdlq
```

Estos valores coinciden con el `.env.local` por defecto.

## Troubleshooting

### Puerto 5432 ya en uso

```bash
# Encontrar qué está usando el puerto
lsof -i :5432

# Cambiar puerto en docker-compose.yml
# Cambiar: "5432:5432" por "5433:5432"
```

### No puede conectar a PostgreSQL

```bash
# Verificar que el contenedor está corriendo
docker-compose ps

# Ver logs
docker-compose logs postgres

# Reiniciar
docker-compose restart postgres
```

### Datos persistidos incorrectamente

El volumen `postgres_data` persiste en `docker_postgres_data`. Para ver:

```bash
docker volume ls | grep postgres
```
