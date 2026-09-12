# DM Admin — Roadmap de Evolución hacia VTT

**Objetivo:** Transformar DM Admin en una plataforma completa de juego de rol en línea, combinando la gestión de campaña y mundo ya existente con funciones de mesa virtual (VTT) al estilo Roll20.

**Última actualización:** 2026-09-07 (implementación Subsistema 1)

---

## Estado actual del proyecto

Las siguientes fases ya están completadas (ver `docs/superpowers/specs/2026-08-31-dm-admin-platform-architecture.md`):

| Fase | Estado | Qué incluye |
|------|--------|-------------|
| Fase 0 — Fundación | Completada | Auth, scaffolding, Docker |
| Fase 1 — MVP Core | Completada | Campañas, entidades, permisos por rol, Stripe (desactivado) |
| Fase 2 — Profundidad del Mundo | Completada | Campos dinámicos, tipos custom, relaciones, grafo Cytoscape.js |
| Fase 3 — Tiempo Real | Completada | SignalR en CampaignHub (entidades, presencia) + SessionHub (chat, dados, presencia de sesión) |
| Fase 4 — Launch Polish | Pendiente | Exportación, historial, onboarding, emails, mobile |

---

## Nuevos subsistemas VTT — Plan de expansión

Los subsistemas se diseñan, planifican e implementan en orden. Cada uno tiene su propio spec y plan de implementación.

---

### Subsistema 1 — Sesiones de juego: Chat + Dados
**Estado:** ✅ Implementado y compilando
**Spec:** `docs/superpowers/specs/2026-09-07-subsistema1-sesiones-chat-dados.md`
**Plan:** `docs/superpowers/specs/2026-09-07-subsistema1-plan-implementacion.md`

**Qué resuelve:** Permite que el DM abra una "sesión" de juego en una campaña y que todos los participantes se conecten a una sala en tiempo real con chat y tiradas de dados.

**Funciones clave:**
- Sesiones vinculadas a una campaña (el DM las crea/cierra)
- Chat en tiempo real por sesión via SignalR
- Tipos de mensaje: texto normal, resultado de dados, narración del DM, susurros privados
- Comandos de dados: `/roll 2d6`, `/roll 1d20+5`, `/roll 4d6 ventaja`, etc.
- Historial de la sesión persistido en BD
- Indicador de presencia (quién está conectado)

**Dependencias:** Aprovecha SignalR ya instalado. Extiende el sistema de permisos/roles existente.

---

### Subsistema 2 — Mapa Virtual (VTT básico)
**Estado:** Spec y plan escritos — pendiente de implementación
**Spec:** `docs/superpowers/specs/2026-09-07-subsistema2-mapa-virtual-spec.md`
**Plan:** `docs/superpowers/specs/2026-09-07-subsistema2-mapa-virtual-plan.md`

**Qué resuelve:** El DM puede cargar una imagen de mapa, colocar tokens que representan personajes o criaturas, y todos los jugadores ven el mapa y los movimientos en tiempo real.

**Funciones clave:**
- Lienzo interactivo (canvas) con imagen de fondo
- Grid configurable (cuadrado / hexagonal / sin grid)
- Tokens vinculados a entidades del mundo
- Movimiento de tokens sincronizado en tiempo real
- Capas: mapa de fondo / tokens / notas del DM
- Múltiples mapas por sesión (cambio de escena)

**Dependencias:** Subsistema 1 (sesión activa). Librería de canvas (Pixi.js o Konva.js).

---

### Subsistema 3 — Fichas de personaje
**Estado:** Spec y plan escritos — pendiente de implementación
**Spec:** `docs/superpowers/specs/2026-09-07-subsistema3-fichas-personaje-spec.md`
**Plan:** `docs/superpowers/specs/2026-09-07-subsistema3-fichas-personaje-plan.md`

**Qué resuelve:** Cada jugador tiene una ficha de personaje estructurada y editable, ligada a la entidad de tipo "Personaje" que ya existe en el mundo.

**Funciones clave:**
- Plantilla de ficha configurable por el DM (aprovecha EntityTypeFields)
- Atributos numéricos con modificadores calculados
- Puntos de vida / recursos con barra visual
- Integración con el sistema de dados (tirar directamente desde la ficha)
- Visible para el DM en todo momento; el jugador edita la suya

**Dependencias:** Sistema de entidades y campos dinámicos (Fase 2). Subsistema 1 (dados desde la ficha).

---

### Subsistema 4 — VTT avanzado
**Estado:** Spec y plan escritos — pendiente de implementación
**Spec:** `docs/superpowers/specs/2026-09-07-subsistema4-vtt-avanzado-spec.md`
**Plan:** `docs/superpowers/specs/2026-09-07-subsistema4-vtt-avanzado-plan.md`

**Qué resuelve:** Añade funciones avanzadas de mesa virtual que enriquecen la experiencia de juego.

**Funciones clave:**
- Niebla de guerra (fog of war) — el DM revela zonas del mapa progresivamente
- Iluminación dinámica — fuentes de luz afectan la visibilidad
- Medición de distancias en el grid
- Auras y estados sobre tokens (envenenado, concentración, etc.)
- Iniciativa / orden de turno con tracker visual

**Dependencias:** Subsistema 2 (mapa funcional).

---

## Registro de progreso

| Fecha | Subsistema | Avance |
|-------|------------|--------|
| 2026-09-07 | Plan general | Roadmap creado, orden de subsistemas definido |
| 2026-09-07 | Subsistema 1 | Spec completo escrito y aprobado |
| 2026-09-07 | Subsistema 1 | Plan de implementación escrito (7 fases, 20 pasos) |
| 2026-09-07 | Subsistemas 2, 3 y 4 | Specs y planes de implementación escritos para todos |
| 2026-09-07 | Subsistema 1 | Implementación completa — backend (10 archivos) + frontend (10 archivos), builds OK |

---

## Notas de arquitectura transversal

- **Real-time:** CampaignHub en `/hubs/campaign` (entidades/presencia campaña). SessionHub en `/hubs/session` (mensajes/presencia de sesión). Ambos usan JWT via query string `access_token`.
- **Permisos:** El sistema de roles (DM / Co-DM / Player / Spectator) se aplica también a las sesiones y al mapa.
- **Backend:** Los nuevos endpoints se añaden como nuevas Features en el API siguiendo el patrón vertical-slice ya establecido.
- **Frontend:** Nuevas rutas lazy-loaded bajo `/campaigns/:id/session` siguiendo la estructura feature-based existente.
