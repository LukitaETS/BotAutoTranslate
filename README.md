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
