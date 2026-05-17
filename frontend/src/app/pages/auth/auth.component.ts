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
    <div class="auth-page">
      <div class="card auth-card shadow-sm">
        <div class="card-body p-4 p-md-5">
          <div class="text-center mb-4">
          <h1 class="h3 fw-bold text-dark mb-1">
            {{ tab === 'signin' ? 'Entrar na sua conta' : 'Criar nova conta' }}
          </h1>
          <p class="text-muted small mb-0">SIG Heartbeat Hub · Holding IMTS</p>
          <p *ngIf="showLocalDemoHint" class="alert alert-secondary small text-start mt-3 mb-0 py-2">
            Stack local: <strong>dev@local.imts</strong> · <strong>demo123456</strong>
          </p>
          </div>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div *ngIf="tab === 'signup'" class="mb-3 d-flex flex-column gap-2">
            <input formControlName="nome" type="text" placeholder="Nome" class="form-control" />
            <input formControlName="organizacao" type="text" placeholder="Organização" class="form-control" />
          </div>
          <div class="mb-3">
            <input formControlName="email" type="email" placeholder="E-mail" class="form-control" autocomplete="email" />
          </div>
          <div class="mb-3">
          <input
            formControlName="password"
            type="password"
            placeholder="Senha"
            class="form-control"
            autocomplete="current-password"
          />
          </div>
          <button type="submit" [disabled]="loading" class="btn btn-primary w-100">
            {{ tab === 'signin' ? 'Entrar' : 'Cadastrar' }}
          </button>
        </form>
        <div class="text-center mt-3">
          <button type="button" (click)="toggleTab()" class="btn btn-link btn-sm p-0">
            {{ tab === 'signin' ? 'Não tem conta? Criar' : 'Já tem conta? Entrar' }}
          </button>
        </div>
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
    this.form.markAsUntouched();
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const missing: string[] = [];
      if (this.form.get('email')?.invalid) missing.push('e-mail válido');
      if (this.form.get('password')?.invalid) missing.push('senha com pelo menos 6 caracteres');
      if (this.tab === 'signup') {
        if (this.form.get('nome')?.invalid) missing.push('nome');
        if (this.form.get('organizacao')?.invalid) missing.push('organização');
      }
      this.toastService.show({
        title: 'Verifique os campos',
        description: missing.length ? `Preencha: ${missing.join(', ')}.` : 'Alguns campos estão incorretos.',
        variant: 'destructive',
      });
      return;
    }
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