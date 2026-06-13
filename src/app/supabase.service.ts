import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey
  );

  get session(): Promise<Session | null> {
    return this.client.auth.getSession().then(({ data }) => data.session);
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }

  async signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return this.client.auth.signOut();
  }

  async callFunction<T>(name: string, body?: unknown, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST'): Promise<T> {
    const { data: { session } } = await this.client.auth.getSession();
    if (!session) throw new Error('Não autenticado');

    const url = `${environment.functionsUrl}/${name}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': environment.supabaseAnonKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json as T;
  }

  async callFunctionGet<T>(name: string, params?: Record<string, string>): Promise<T> {
    const { data: { session } } = await this.client.auth.getSession();
    if (!session) throw new Error('Não autenticado');

    const url = new URL(`${environment.functionsUrl}/${name}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': environment.supabaseAnonKey,
      },
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json as T;
  }
}
