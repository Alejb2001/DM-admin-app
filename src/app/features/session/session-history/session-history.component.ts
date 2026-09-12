import { Component, inject, signal, OnInit, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { SessionService } from '../services/session.service';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { GameSession, ChatMessage } from '../models/session.models';

@Component({
  selector: 'app-session-history',
  standalone: true,
  imports: [
    DatePipe, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatChipsModule, MatDividerModule,
    ChatMessageComponent,
  ],
  template: `
    <div class="history-container">
      <div class="history-header">
        <a [routerLink]="['/campaigns', id()]" class="back-link">
          <mat-icon>arrow_back</mat-icon> Volver a la campaña
        </a>
        <h1>Historial de sesiones</h1>
      </div>

      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:48px"><mat-spinner /></div>
      } @else if (sessions().length === 0) {
        <p class="empty">No hay sesiones registradas aún.</p>
      } @else {
        @for (s of sessions(); track s.id) {
          <mat-card class="session-card">
            <mat-card-header>
              <mat-card-title>{{ s.name }}</mat-card-title>
              <mat-card-subtitle>
                {{ s.startedAt | date:'dd/MM/yyyy HH:mm' }}
                @if (s.endedAt) { — {{ s.endedAt | date:'HH:mm' }} }
                <mat-chip [color]="s.status === 'active' ? 'primary' : 'default'" style="margin-left:8px">
                  {{ s.status === 'active' ? 'Activa' : 'Cerrada' }}
                </mat-chip>
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-actions>
              @if (s.status === 'active') {
                <a mat-raised-button color="primary" [routerLink]="['/campaigns', id(), 'session', s.id]">
                  <mat-icon>login</mat-icon> Entrar
                </a>
              } @else {
                <button mat-stroked-button (click)="toggleLog(s.id)">
                  <mat-icon>{{ expandedId() === s.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                  {{ expandedId() === s.id ? 'Ocultar log' : 'Ver log' }}
                </button>
              }
            </mat-card-actions>
            @if (expandedId() === s.id) {
              <mat-card-content>
                <mat-divider style="margin: 8px 0" />
                @if (loadingLog()) {
                  <mat-spinner diameter="24" />
                } @else {
                  <div class="log-container">
                    @for (msg of sessionLog(); track msg.id) {
                      <app-chat-message [message]="msg" />
                    }
                    @if (sessionLog().length === 0) {
                      <p class="empty">No hay mensajes en esta sesión.</p>
                    }
                  </div>
                  @if (hasMoreMessages()) {
                    <button mat-stroked-button (click)="loadMoreMessages(s.id)" style="margin-top:8px">
                      Cargar más mensajes
                    </button>
                  }
                }
              </mat-card-content>
            }
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .history-container { max-width: 800px; margin: 0 auto; padding: 24px 16px; }
    .history-header { margin-bottom: 24px; }
    .back-link { display: flex; align-items: center; gap: 4px; color: #616161; text-decoration: none; font-size: 14px; margin-bottom: 8px; }
    .session-card { margin-bottom: 16px; }
    .empty { color: #9e9e9e; font-style: italic; }
    .log-container { max-height: 500px; overflow-y: auto; padding: 8px; }
  `],
})
export class SessionHistoryComponent implements OnInit {
  id = input.required<string>(); // campaignId

  private service = inject(SessionService);

  sessions = signal<GameSession[]>([]);
  loading = signal(true);
  expandedId = signal<string | null>(null);
  sessionLog = signal<ChatMessage[]>([]);
  loadingLog = signal(false);
  hasMoreMessages = signal(false);
  private currentPage = 1;
  private currentSessionId: string | null = null;

  ngOnInit() {
    this.service.getSessions(this.id()).subscribe({
      next: data => {
        this.sessions.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleLog(sessionId: string) {
    if (this.expandedId() === sessionId) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(sessionId);
    this.currentSessionId = sessionId;
    this.currentPage = 1;
    this.sessionLog.set([]);
    this.loadingLog.set(true);

    this.service.getMessages(this.id(), sessionId, 1, 50).subscribe({
      next: msgs => {
        this.sessionLog.set(msgs);
        this.hasMoreMessages.set(msgs.length === 50);
        this.loadingLog.set(false);
      },
      error: () => this.loadingLog.set(false),
    });
  }

  loadMoreMessages(sessionId: string) {
    this.currentPage++;
    this.service.getMessages(this.id(), sessionId, this.currentPage, 50).subscribe({
      next: msgs => {
        this.sessionLog.update(existing => [...existing, ...msgs]);
        this.hasMoreMessages.set(msgs.length === 50);
      },
    });
  }
}
