import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user = new BehaviorSubject<User | null>(null);
  private _session = new BehaviorSubject<Session | null>(null);
  private _loading = new BehaviorSubject<boolean>(true);

  public readonly user$ = this._user.asObservable();
  public readonly session$ = this._session.asObservable();
  public readonly loading$ = this._loading.asObservable();

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private async initializeAuth() {
    const { data: { session } } = await this.supabaseService.client.auth.getSession();
    this._session.next(session);
    this._user.next(session?.user ?? null);
    this._loading.next(false);

    this.supabaseService.client.auth.onAuthStateChange((event, session) => {
      this._session.next(session);
      this._user.next(session?.user ?? null);
      this._loading.next(false);
    });
  }

  async signIn(email: string, password: string) {
    const { error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
  }

  async signUp(email: string, password: string, nome: string, organizacao: string) {
    const { error } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: {
        data: { nome, organizacao }
      }
    });
    if (error) throw error;
  }

  async signOut() {
    const { error } = await this.supabaseService.client.auth.signOut();
    if (error) throw error;
    this.router.navigate(['/auth']);
  }

  get user(): User | null {
    return this._user.value;
  }

  get session(): Session | null {
    return this._session.value;
  }

  get loading(): boolean {
    return this._loading.value;
  }
}