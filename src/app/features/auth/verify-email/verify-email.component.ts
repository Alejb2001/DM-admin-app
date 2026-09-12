import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

type VerifyState = 'loading' | 'success' | 'invalid_token' | 'token_expired' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-content>
          <div class="content">

            @if (state() === 'loading') {
              <mat-spinner diameter="48" />
              <p class="status-text">Verificando tu cuenta...</p>
            }

            @if (state() === 'success') {
              <mat-icon class="status-icon success">check_circle</mat-icon>
              <h2>¡Cuenta verificada!</h2>
              <p class="status-text">Tu correo ha sido confirmado. Entrando a la aplicación...</p>
            }

            @if (state() === 'invalid_token') {
              <mat-icon class="status-icon error">error</mat-icon>
              <h2>Enlace inválido</h2>
              <p class="status-text">Este enlace de verificación no es válido o ya fue utilizado.</p>
              <a routerLink="/auth/login" mat-raised-button color="primary">Ir al inicio de sesión</a>
            }

            @if (state() === 'token_expired') {
              <mat-icon class="status-icon warn">schedule</mat-icon>
              <h2>Enlace expirado</h2>
              <p class="status-text">El enlace de verificación ha expirado (válido por 24 horas).</p>
              @if (resendSuccess()) {
                <p class="resend-success">Correo reenviado. Revisa tu bandeja de entrada.</p>
              } @else {
                <button mat-raised-button color="primary"
                        [disabled]="resendLoading()"
                        (click)="requestResend()">
                  @if (resendLoading()) {
                    <mat-spinner diameter="18" />
                  } @else {
                    Solicitar nuevo enlace
                  }
                </button>
              }
              <a routerLink="/auth/login" class="back-link">Volver al inicio de sesión</a>
            }

            @if (state() === 'error') {
              <mat-icon class="status-icon error">error</mat-icon>
              <h2>Algo salió mal</h2>
              <p class="status-text">Ocurrió un error al verificar tu cuenta. Intenta de nuevo.</p>
              <a routerLink="/auth/login" mat-raised-button color="primary">Volver al inicio de sesión</a>
            }

          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f5f5f5;
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 16px;
    }
    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 16px 0;
      gap: 12px;
    }
    .status-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
    }
    .status-icon.success { color: #2e7d32; }
    .status-icon.error   { color: #c62828; }
    .status-icon.warn    { color: #f57f17; }
    h2 { margin: 0; }
    .status-text { margin: 0; color: #424242; font-size: 14px; }
    .resend-success { color: #2e7d32; font-size: 13px; margin: 0; }
    .back-link {
      font-size: 13px;
      color: #3F51B5;
      text-decoration: none;
    }
    .back-link:hover { text-decoration: underline; }
  `],
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  state = signal<VerifyState>('loading');
  resendLoading = signal(false);
  resendSuccess = signal(false);

  private expiredEmail: string | null = null;

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('invalid_token');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.state.set('success');
        setTimeout(() => this.router.navigate(['/campaigns']), 2000);
      },
      error: (err) => {
        const errorCode = err.error?.error;
        if (errorCode === 'invalid_token') {
          this.state.set('invalid_token');
        } else if (errorCode === 'token_expired') {
          this.state.set('token_expired');
        } else {
          this.state.set('error');
        }
      },
    });
  }

  requestResend() {
    const email = this.expiredEmail ?? this.authService.pendingVerificationEmail();
    if (!email) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.resendLoading.set(true);
    this.authService.resendVerification(email).subscribe({
      next: () => {
        this.resendSuccess.set(true);
        this.resendLoading.set(false);
      },
      error: () => this.resendLoading.set(false),
    });
  }
}
