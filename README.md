# Discord Language Bot + Web Panel

Proyecto completo en Node.js para administrar un bot de Discord multilenguaje junto con un panel web de administración.

## Qué incluye

- Bot con `discord.js` `14.22.1`
- Slash commands:
  - `/idioma`
  - `/anuncio`
  - `/evento`
  - `/config`
- MongoDB compartido para configuración y preferencias de idioma
- Panel web con Express + EJS
- Login con Discord OAuth2
- API interna protegida entre panel y bot
- Fallback a canal en inglés cuando el DM falla
- Docker, Docker Compose y ejemplo de despliegue

## Estructura

```text
/bot
/web
/commands
/events
/routes
/models
/services
/utils
/config
/scripts
```

## Requisitos

- Node.js 18.18 o superior
- MongoDB 6+ o MongoDB Atlas
- Una aplicación de Discord con bot habilitado

## Instalación local

1. Instala dependencias:

```bash
npm install
```

2. Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Completa las variables del `.env`.

4. Registra los slash commands:

```bash
npm run register:commands
```

5. Inicia el bot y el panel:

```bash
npm run dev
```

O por separado:

```bash
npm run start:bot
npm run start:web
```

## Variables de entorno principales

- `MONGO_URI`: conexión a MongoDB
- `BOT_TOKEN`: token del bot
- `DISCORD_CLIENT_ID`: client ID de la app
- `DISCORD_CLIENT_SECRET`: client secret
- `DISCORD_REDIRECT_URI`: callback OAuth2, por ejemplo `http://localhost:3000/auth/callback`
- `BOT_INTERNAL_API_TOKEN`: token compartido entre panel y bot
- `BOT_INTERNAL_API_URL`: URL del bot para la API interna
- `APP_BASE_URL`: URL pública del panel
- `TRANSLATION_PROVIDER`: `libretranslate` o `none`
- `TRANSLATION_API_URL`: endpoint del proveedor de traducción

## Cómo configurar Discord OAuth2

### 1. Crear la aplicación

En el [Discord Developer Portal](https://discord.com/developers/applications):

1. Crea una nueva aplicación.
2. En la sección `Bot`, crea el bot.
3. Copia:
   - `Application ID` -> `DISCORD_CLIENT_ID`
   - `Client Secret` -> `DISCORD_CLIENT_SECRET`
   - `Bot Token` -> `BOT_TOKEN`

### 2. Activar intents

En la pestaña `Bot`, habilita:

- `Server Members Intent`

Este proyecto lo necesita para:

- asignar roles por idioma
- recorrer miembros del servidor
- enviar anuncios y eventos a cada usuario

### 3. Configurar OAuth2 para el panel

En `OAuth2 > General`:

- añade la redirect URL exacta, por ejemplo:
  - `http://localhost:3000/auth/callback`
  - `https://tu-dominio.com/auth/callback`

En el login web se usan los scopes:

- `identify`
- `guilds`

### 4. Invitar el bot al servidor

Puedes generar una URL con scopes:

- `bot`
- `applications.commands`

Permisos recomendados:

- `View Channels`
- `Send Messages`
- `Embed Links`
- `Manage Roles`
- `Use Slash Commands`

## Cómo usar el bot

### `/idioma`

El usuario elige un idioma (`en`, `es`, `pt`, etc.), se guarda en MongoDB y el bot intenta sincronizar el rol correspondiente.

### `/anuncio`

Solo administradores.

- Traduce el mensaje por idioma
- Envía DM personalizado
- Si falla el DM:
  - usa el canal fallback
  - envía el texto en inglés
  - menciona al usuario

### `/evento`

Solo administradores.

- título
- descripción
- fecha

Se traduce y se reparte con el mismo mecanismo de fallback.

### `/config`

Subcomandos incluidos:

- `ver`
- `canal-logs`
- `canal-fallback`
- `idioma-default`
- `rol-idioma`

## Cómo usar el panel web

1. Abre `APP_BASE_URL`
2. Inicia sesión con Discord
3. El dashboard mostrará solo servidores donde:
   - el bot ya está dentro
   - tu usuario tiene permiso de administrador
4. En cada servidor puedes:
   - configurar canales
   - mapear roles por idioma
   - cambiar idioma por defecto
   - enviar anuncios
   - crear eventos
   - ver y modificar el idioma de usuarios

## API REST del panel

Rutas principales:

- `GET /api/servers`
- `GET /api/servers/:guildId`
- `PUT /api/servers/:guildId/config`
- `GET /api/servers/:guildId/users`
- `POST /api/servers/:guildId/announce`
- `POST /api/servers/:guildId/events`
- `PATCH /api/servers/:guildId/users/:userId/language`

Todas requieren sesión web válida.

## Traducción automática

Por defecto el proyecto usa `LibreTranslate` vía HTTP.

Si quieres un entorno más estable en producción, lo recomendable es:

- usar una instancia propia de LibreTranslate
- o adaptar `services/translation-service.js` a tu proveedor favorito

Si desactivas la traducción:

```env
TRANSLATION_PROVIDER=none
```

el sistema seguirá funcionando, pero enviará el texto original.

## Despliegue en Railway

Puedes crear dos servicios desde el mismo repositorio:

- servicio `bot`
- servicio `web`

### Servicio bot

- Root directory: repositorio completo
- Start command:

```bash
npm run start:bot
```

### Servicio web

- Root directory: repositorio completo
- Start command:

```bash
npm run start:web
```

### Base de datos

- añade MongoDB Atlas o una base Mongo gestionada
- configura la misma `MONGO_URI` en ambos servicios

### Variables importantes

- `APP_BASE_URL` debe coincidir con la URL pública del panel
- `DISCORD_REDIRECT_URI` debe apuntar a `https://tu-panel/auth/callback`
- `BOT_INTERNAL_API_URL` debe apuntar a la URL interna o pública del servicio del bot
- `BOT_INTERNAL_API_TOKEN` debe ser idéntico en bot y web

## Despliegue en VPS

Tienes tres opciones cómodas:

### Opción A: Docker Compose

```bash
docker compose up --build -d
```

Esto levanta:

- MongoDB
- bot
- panel web

### Opción B: PM2

```bash
npm install
pm2 start ecosystem.config.js
```

### Opción C: procesos manuales

```bash
npm run start:bot
npm run start:web
```

## Notas de producción

- Usa HTTPS para el panel
- Protege bien `BOT_TOKEN`, `CLIENT_SECRET` y `BOT_INTERNAL_API_TOKEN`
- Verifica que el rol del bot esté por encima de los roles de idioma
- En servidores grandes, considera segmentar anuncios o añadir colas persistentes
- `discord.js` ya maneja rate limits REST; además este proyecto añade limitación de envío en DMs con `Bottleneck`

## Referencias oficiales útiles

- Discord OAuth2 docs: [https://discord.com/developers/docs/topics/oauth2](https://discord.com/developers/docs/topics/oauth2)
- Discord OAuth2 and permissions: [https://docs.discord.com/developers/platform/oauth2-and-permissions](https://docs.discord.com/developers/platform/oauth2-and-permissions)
- discord.js npm package: [https://www.npmjs.com/package/discord.js](https://www.npmjs.com/package/discord.js)
