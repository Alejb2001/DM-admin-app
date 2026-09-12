import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  hidePassword = signal(true);
  loading = false;
  errorMessage = '';
  emailNotVerified = false;
  resendLoading = false;
  resendSuccess = false;

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.emailNotVerified = false;
    this.resendSuccess = false;

    const { email, password } = this.form.value;
    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => this.router.navigate(['/campaigns']),
      error: (err) => {
        if (err.status === 403) {
          this.emailNotVerified = true;
          this.errorMessage = 'Debes verificar tu correo electrónico antes de entrar.';
        } else {
          this.errorMessage = 'Email o contraseña incorrectos.';
        }
        this.loading = false;
      },
    });
  }

  resendVerification() {
    const email = this.form.value.email;
    if (!email) return;
    this.resendLoading = true;
    this.authService.resendVerification(email).subscribe({
      next: () => {
        this.resendSuccess = true;
        this.resendLoading = false;
      },
      error: () => {
        this.resendLoading = false;
      },
    });
  }
}
