import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './landing.component.html',
})
export class LandingComponent {
  readonly features = [
    { icon: 'public',     title: 'Construye tu mundo',       desc: 'Crea personajes, lugares, facciones y eventos con campos personalizados.' },
    { icon: 'hub',        title: 'Red de relaciones',         desc: 'Vincula entidades con relaciones tipificadas y visualiza el grafo del mundo.' },
    { icon: 'visibility', title: 'Control de revelación',     desc: 'Decide qué ven tus jugadores. Desvela el lore progresivamente.' },
    { icon: 'bolt',       title: 'Tiempo real',               desc: 'Colaboración simultánea con SignalR. Los cambios se propagan al instante.' },
    { icon: 'lock',       title: 'Permisos por rol',          desc: 'Co-DMs, jugadores y espectadores con acceso granular por entidad.' },
    { icon: 'download',   title: 'Exportación',               desc: 'Exporta tu campaña en JSON como backup o para migrar entre plataformas.' },
  ];

  readonly plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'para siempre',
      color: '#607D8B',
      features: ['1 campaña', '20 entidades', '4 jugadores', 'Tiempo real incluido'],
      cta: 'Empezar gratis',
      link: '/auth/register',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$6',
      period: '/mes',
      color: '#3F51B5',
      features: ['5 campañas', '200 entidades por campaña', '8 jugadores', '5 tipos de entidad custom', 'Exportación PDF', 'Subida de imágenes'],
      cta: 'Elegir Pro',
      link: '/auth/register',
      highlight: true,
    },
    {
      name: 'Master',
      price: '$12',
      period: '/mes',
      color: '#7B1FA2',
      features: ['Campañas ilimitadas', 'Entidades ilimitadas', 'Jugadores ilimitados', 'Historial de cambios', 'Todo de Pro'],
      cta: 'Elegir Master',
      link: '/auth/register',
      highlight: false,
    },
  ];
}
