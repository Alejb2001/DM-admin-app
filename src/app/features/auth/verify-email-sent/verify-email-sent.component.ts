import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email-sent',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-content>
          <div class="content">
            <mat-icon class="envelope-icon">mark_email_unread</mat-icon>
            <h2>Revisa tu correo</h2>
            <p class="email-hint">
              Hemos enviado un enlace de verificación a<br/>
              <strong>{{ email() ?? 'tu correo electrónico' }}</strong>
            </p>
            <p class="hint">El enlace expira en 24 horas. Si no lo ves, revisa tu carpeta de spam.</p>

            @if (resendSuccess()) {
              <p class="resend-success">Correo reenviado correctamente.</p>
            } @else {
              <button mat-stroked-button class="resend-btn"
                      [disabled]="resendLoading() || !email()"
                      (click)="resend()">
                @if (resendLoading()) {
                  <mat-spinner diameter="18" />
                } @else {
                  Reenviar correo
                }
              </button>
            }

            <a routerLink="/auth/login" class="back-link">Volver al inicio de sesión</a>
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
      padding: 8px 0;
      gap: 8px;
    }
    .envelope-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: #3F51B5;
    }
    h2 {
      margin: 8px 0 4px;
      color: #1a1a2e;
    }
    .email-hint {
      margin: 0;
      color: #424242;
      font-size: 14px;
      line-height: 1.6;
    }
    .hint {
      margin: 4px 0 16px;
      color: #757575;
      font-size: 13px;
    }
    .resend-btn {
      width: 100%;
      margin-bottom: 4px;
    }
    .resend-success {
      color: #2e7d32;
      font-size: 13px;
      margin: 8px 0;
    }
    .back-link {
      font-size: 13px;
      color: #3F51B5;
      text-decoration: none;
      margin-top: 8px;
    }
    .back-link:hover { text-decoration: underline; }
  `],
})
export class VerifyEmailSentComponent {
  private authService = inject(AuthService);

  email = this.authService.pendingVerificationEmail;
  resendLoading = signal(false);
  resendSuccess = signal(false);

  resend() {
    const e = this.email();
    if (!e) return;
    this.resendLoading.set(true);
    this.authService.resendVerification(e).subscribe({
      next: () => {
        this.resendSuccess.set(true);
        this.resendLoading.set(false);
      },
      error: () => this.resendLoading.set(false),
    });
  }
}
