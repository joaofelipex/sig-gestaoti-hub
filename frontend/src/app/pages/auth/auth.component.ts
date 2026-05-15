import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div class="w-full max-w-md space-y-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div class="text-center">
          <h2 class="text-3xl font-extrabold tracking-tight text-gray-900">
            {{ tab === 'signin' ? 'Entrar na sua conta' : 'Criar nova conta' }}
          </h2>
          <p class="mt-2 text-sm text-gray-500">SIG Heartbeat Hub · Holding IMTS</p>
          <p *ngIf="showLocalDemoHint" class="mt-3 rounded-md bg-slate-50 px-3 py-2 text-left text-xs text-slate-600">
            Stack local após <code class="rounded bg-slate-200 px-1">npm run db:up</code> na raiz e
            <code class="rounded bg-slate-200 px-1">npm run api:dev</code>:
            <span class="font-medium">dev@local.imts</span> · palavra-passe
            <span class="font-medium">demo123456</span>
          </p>
        </div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div *ngIf="tab === 'signup'" class="space-y-3">
            <input formControlName="nome" type="text" placeholder="Nome" class="app-field" />
            <input formControlName="organizacao" type="text" placeholder="Organização" class="app-field" />
          </div>
          <input formControlName="email" type="email" placeholder="E-mail" class="app-field" autocomplete="email" />
          <input
            formControlName="password"
            type="password"
            placeholder="Senha"
            class="app-field"
            autocomplete="current-password"
          />
          <button type="submit" [disabled]="loading" class="app-btn-primary mt-2">
            {{ tab === 'signin' ? 'Entrar' : 'Cadastrar' }}
          </button>
        </form>
        <div class="text-center">
          <button type="button" (click)="toggleTab()" class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
            {{ tab === 'signin' ? 'Não tem conta? Criar' : 'Já tem conta? Entrar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AuthComponent {
  tab: 'signin' | 'signup' = 'signin';
  form: FormGroup;
  loading = false;
  /** Mostrar credenciais demo quando corres contra a stack local (Postgres + API). */
  readonly showLocalDemoHint = environment.showLocalDemoHint;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.form = this.fb.group({
      nome: [''],
      organizacao: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  toggleTab() {
    this.tab = this.tab === 'signin' ? 'signup' : 'signin';
    if (this.tab === 'signin') {
      this.form.get('nome')?.clearValidators();
      this.form.get('organizacao')?.clearValidators();
    } else {
      this.form.get('nome')?.setValidators(Validators.required);
      this.form.get('organizacao')?.setValidators(Validators.required);
    }
    this.form.get('nome')?.updateValueAndValidity();
    this.form.get('organizacao')?.updateValueAndValidity();
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    try {
      if (this.tab === 'signin') {
        await this.authService.signIn(this.form.value.email, this.form.value.password);
        this.toastService.show({ title: 'Bem-vindo de volta!' });
      } else {
        await this.authService.signUp(
          this.form.value.email,
          this.form.value.password,
          this.form.value.nome,
          this.form.value.organizacao
        );
        this.toastService.show({ title: 'Conta criada', description: 'Sua organização foi provisionada. Você já está logado.' });
      }
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.toastService.show({
        title: this.tab === 'signin' ? 'Não foi possível entrar' : 'Não foi possível cadastrar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      this.loading = false;
    }
  }
}