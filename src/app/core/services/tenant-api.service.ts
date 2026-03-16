import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TenantConfig } from '../models/tenant-config.model';

@Injectable({ providedIn: 'root' })
export class TenantApiService {
  private readonly http = inject(HttpClient);

  getConfig(slug: string): Observable<TenantConfig> {
    return this.http.get<TenantConfig>(`/t/${slug}/config`);
  }
}

