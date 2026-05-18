import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { EmpresaService } from '../../services/empresa.service';
import { ToastService } from '../../services/toast.service';
import { WhiteLabelService } from '../../services/white-label.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="sig-login">
      <div class="sig-login__visual" aria-hidden="true">
        <div class="sig-login__visual-bg"></div>
        <div class="sig-login__energy"></div>
      </div>

      <div class="sig-login__panel">
        <div class="sig-login__card">
          <img *ngIf="wl.logoLogin" [src]="wl.logoLogin" [alt]="wl.brandName" class="sig-login__logo" />
          <span *ngIf="!wl.logoLogin" class="sig-login__logo-fallback">{{ wl.brandName }}</span>

          <h1 class="sig-login__title">
            <span class="sig-login__title-accent">{{ tab === 'signin' ? 'Entrar' : 'Criar conta' }}</span>
          </h1>
          <p class="sig-login__sub">{{ wl.brandName }} · {{ wl.brandSubtitle }}</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div *ngIf="tab === 'signup'" class="sig-login__field">
              <label class="sig-login__label" for="nome">Nome</label>
              <input id="nome" formControlName="nome" type="text" class="sig-login__input" autocomplete="name" />
            </div>
            <div *ngIf="tab === 'signup'" class="sig-login__field">
              <label class="sig-login__label" for="organizacao">Organização</label>
              <input id="organizacao" formControlName="organizacao" type="text" class="sig-login__input" />
            </div>

            <div class="sig-login__field">
              <label class="sig-login__label" for="email">E-mail</label>
              <input id="email" formControlName="email" type="email" class="sig-login__input" autocomplete="email" />
            </div>

            <div class="sig-login__field">
              <label class="sig-login__label" for="password">Senha</label>
              <input
                id="password"
                formControlName="password"
                type="password"
                class="sig-login__input"
                autocomplete="current-password"
              />
            </div>

            <button type="submit" class="sig-login__submit" [disabled]="loading">
              {{ tab === 'signin' ? 'Entrar' : 'Cadastrar' }}
            </button>
          </form>

          <button type="button" class="sig-login__toggle" (click)="toggleTab()">
            {{ tab === 'signin' ? 'Não tem conta? Criar' : 'Já tem conta? Entrar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class AuthComponent {
  tab: 'signin' | 'signup' = 'signin';
  form: FormGroup;
  loading = false;
  constructor(
    readonly wl: WhiteLabelService,
    private fb: FormBuilder,
    private authService: AuthService,
    private dashboard: DashboardService,
    private empresa: EmpresaService,
    private router: Router,
    private toastService: ToastService,
  ) {
    this.form = this.fb.group({
      nome: [''],
      organizacao: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
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
        this.toastService.show({
          title: 'Conta criada',
          description: 'Organização nova começa sem registos — importe ou crie dados no menu.',
        });
      }
      this.empresa.setSelected(null);
      await this.dashboard.loadData();
      this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.toastService.show({
        title: this.tab === 'signin' ? 'Não foi possível entrar' : 'Não foi possível cadastrar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      this.loading = false;
    }
  }
}
