import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/subscriptions`;

  createCheckoutSession(tier: string) {
    const successUrl = `${window.location.origin}/campaigns?upgraded=1`;
    const cancelUrl = window.location.href;
    return this.http.post<{ url: string }>(
      `${this.base}/checkout`,
      { tier, successUrl, cancelUrl }
    );
  }

  createPortalSession() {
    const returnUrl = window.location.href;
    return this.http.post<{ url: string }>(
      `${this.base}/portal`,
      { returnUrl }
    );
  }
}
