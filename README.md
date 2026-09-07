# DM Admin

Aplicación web SaaS para directores de juego (Dungeon Masters) de rol de mesa. Permite organizar campañas, construir mundos de forma colaborativa y controlar qué información ven los jugadores, todo en tiempo real.

## Funcionalidades principales

### Campañas
- Crear y gestionar múltiples campañas
- Invitar jugadores mediante código o enlace directo (`/join/:code`)
- Roles por campaña (DM, co-DM, jugadores, espectadores)
- Vista de miembros y gestión de permisos por rol

### Constructor de mundo
- **Tipos de entidad** personalizables (personajes, lugares, facciones, eventos, etc.) con campos de tipo texto, número, fecha, booleano, referencia, texto enriquecido y URL
- **Entidades** con valores en campos custom y control de visibilidad por rol
- **Relaciones tipificadas** entre entidades con etiquetas directas e inversas (p. ej. "lidera" / "es liderado por")
- **Visualización en grafo** interactivo con Cytoscape.js
- **Historial de cambios** por entidad (plan Master)
- **Control de revelación**: el DM decide qué ve cada rol, desvelando el lore progresivamente

### Colaboración en tiempo real
- SignalR (WebSockets) para propagar al instante creaciones, ediciones y borrados de entidades
- Actualizaciones de presencia (quién está conectado en la campaña)
- Sincronización automática de permisos entre todos los participantes

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Angular 19 (standalone components, lazy loading) |
| UI | Angular Material + CDK |
| Grafo | Cytoscape.js |
| Tiempo real | @microsoft/signalr |
| Backend | API REST separada en `http://localhost:5000/api` |

## Estructura del proyecto

```
src/app/
├── core/
│   ├── guards/          # authGuard, guestGuard
│   ├── interceptors/    # JWT auth, upgrade (402)
│   ├── models/          # Modelos de auth y usuario
│   └── services/        # AuthService, SignalRService, SubscriptionService, UpgradeService
└── features/
    ├── auth/            # Login y registro
    ├── campaigns/       # Lista, detalle, invitaciones, join por código
    ├── world/           # Entidades, tipos, relaciones, grafo, permisos
    ├── player-view/     # Vista reducida para jugadores
    ├── landing/         # Página pública con features y pricing
    └── shell/           # Layout principal con navegación
```

## Requisitos previos

- Node.js 20+
- Angular CLI 19: `npm install -g @angular/cli`
- Backend corriendo en `http://localhost:5000` (repositorio separado)

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:4200)
ng serve

# Build de producción
ng build

# Tests unitarios
ng test
```

## Variables de entorno

Edita `src/environments/environment.ts` para desarrollo:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  signalrUrl: 'http://localhost:5000/hubs',
};
```

Para producción, configura `src/environments/environment.production.ts` con las URLs reales.

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/landing` | Página pública de marketing |
| `/auth/login` | Inicio de sesión |
| `/auth/register` | Registro de cuenta |
| `/campaigns` | Lista de campañas del usuario |
| `/campaigns/:id` | Detalle y miembros de una campaña |
| `/campaigns/:id/world` | Listado de entidades del mundo |
| `/campaigns/:id/world/graph` | Visualización en grafo |
| `/campaigns/:id/world/:entityId` | Detalle de una entidad |
| `/join/:code` | Unirse a una campaña por código |
