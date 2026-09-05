import { Component, inject, signal, OnInit, input } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { CampaignService } from '../services/campaign.service';

type Mode = 'register' | 'login';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [
    FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="join-page">
      <div class="join-card">
        <div class="brand">
          <mat-icon class="brand-icon">auto_stories</mat-icon>
          <span class="brand-name">DM Admin</span>
        </div>

        @if (loading()) {
          <div class="center"><mat-spinner diameter="40" /></div>
        } @else if (notFound()) {
          <div class="not-found">
            <mat-icon>error_outline</mat-icon>
            <h2>Código no válido</h2>
            <p>El código de campaña no existe o ha expirado.</p>
            <button mat-raised-button color="primary" (click)="goHome()">Ir al inicio</button>
          </div>
        } @else {
          <div class="campaign-preview">
            <mat-icon class="campaign-icon">shield</mat-icon>
            <p class="invite-label">Te han invitado a unirte a</p>
            <h1 class="campaign-name">{{ campaignName() }}</h1>
          </div>

          @if (joining()) {
            <div class="center"><mat-spinner diameter="32" /><p>Uniéndote a la campaña...</p></div>
          } @else {
            <div class="form-section">
              <div class="mode-toggle">
                <button [class.active]="mode() === 'register'" (click)="setMode('register')">Crear cuenta</button>
                <button [class.active]="mode() === 'login'" (click)="setMode('login')">Ya tengo cuenta</button>
              </div>

              @if (mode() === 'register') {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nombre en la campaña</mat-label>
                  <input matInput [(ngModel)]="displayName" placeholder="Tu nombre o alias" />
                </mat-form-field>
              }

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="email" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Contraseña</mat-label>
                <input matInput type="password" [(ngModel)]="password" (keydown.enter)="submit()" />
              </mat-form-field>

              @if (error()) {
                <div class="error-msg">{{ error() }}</div>
              }

              <button mat-raised-button color="primary" class="full-width submit-btn"
                      (click)="submit()" [disabled]="!canSubmit()">
                <mat-icon>login</mat-icon>
                {{ mode() === 'register' ? 'Crear cuenta y unirse' : 'Iniciar sesión y unirse' }}
              </button>
            </div>
          }
        }
      </div>
    </div>

    <style>
      .join-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 24px; }
      .join-card { background: #fff; border-radius: 16px; padding: 40px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
      .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; }
      .brand-icon { color: #7b1fa2; font-size: 28px; height: 28px; width: 28px; }
      .brand-name { font-size: 20px; font-weight: 700; color: #1a1a2e; }
      .campaign-preview { text-align: center; margin-bottom: 28px; }
      .campaign-icon { font-size: 48px; height: 48px; width: 48px; color: #7b1fa2; }
      .invite-label { color: #757575; font-size: 14px; margin: 8px 0 4px; }
      .campaign-name { font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0; }
      .mode-toggle { display: flex; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
      .mode-toggle button { flex: 1; padding: 10px; border: none; background: #fff; cursor: pointer; font-size: 14px; color: #757575; transition: all .2s; }
      .mode-toggle button.active { background: #7b1fa2; color: #fff; font-weight: 600; }
      .full-width { width: 100%; }
      .submit-btn { margin-top: 8px; height: 48px; font-size: 16px; }
      .error-msg { color: #f44336; font-size: 13px; margin-bottom: 8px; }
      .center { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px 0; color: #757575; }
      .not-found { text-align: center; color: #757575; }
      .not-found mat-icon { font-size: 48px; height: 48px; width: 48px; color: #bdbdbd; }
    </style>
  `,
})
export class JoinComponent implements OnInit {
  code = input.required<string>();

  private auth = inject(AuthService);
  private campaignService = inject(CampaignService);
  private router = inject(Router);

  loading = signal(true);
  notFound = signal(false);
  joining = signal(false);
  campaignName = signal('');
  mode = signal<Mode>('register');
  error = signal<string | null>(null);

  displayName = '';
  email = '';
  password = '';

  ngOnInit() {
    // getAccessToken() is synchronous — safe to check before async user loads
    if (this.auth.getAccessToken()) {
      this.joinDirectly();
      return;
    }
    this.campaignService.getPreview(this.code()).subscribe({
      next: res => { this.campaignName.set(res.name); this.loading.set(false); },
      error: () => { this.notFound.set(true); this.loading.set(false); },
    });
  }

  setMode(m: Mode) {
    this.mode.set(m);
    this.error.set(null);
  }

  canSubmit(): boolean {
    if (!this.email || !this.password) return false;
    if (this.mode() === 'register' && !this.displayName) return false;
    return true;
  }

  submit() {
    if (!this.canSubmit()) return;
    this.error.set(null);

    const auth$ = this.mode() === 'register'
      ? this.auth.register({ email: this.email, password: this.password, displayName: this.displayName })
      : this.auth.login({ email: this.email, password: this.password });

    auth$.subscribe({
      next: () => this.joinDirectly(),
      error: err => this.error.set(err.error?.message ?? 'Error al autenticar. Revisa tus datos.'),
    });
  }

  private joinDirectly() {
    this.joining.set(true);
    this.campaignService.joinByCode(this.code()).subscribe({
      next: campaign => this.router.navigate(['/campaigns', campaign.id]),
      error: err => {
        const msg: string = err.error?.error ?? '';
        if (msg.toLowerCase().includes('miembro') || msg.toLowerCase().includes('member')) {
          // Already a member — go to campaigns list
          this.router.navigate(['/campaigns']);
        } else {
          this.notFound.set(true);
          this.joining.set(false);
        }
      },
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
