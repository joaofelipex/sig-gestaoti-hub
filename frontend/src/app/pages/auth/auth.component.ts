import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {{ tab === 'signin' ? 'Entrar na sua conta' : 'Criar nova conta' }}
          </h2>
        </div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
          <div *ngIf="tab === 'signup'">
            <input formControlName="nome" type="text" placeholder="Nome" class="input">
            <input formControlName="organizacao" type="text" placeholder="Organização" class="input">
          </div>
          <input formControlName="email" type="email" placeholder="E-mail" class="input">
          <input formControlName="password" type="password" placeholder="Senha" class="input">
          <button type="submit" [disabled]="loading" class="btn">
            {{ tab === 'signin' ? 'Entrar' : 'Cadastrar' }}
          </button>
        </form>
        <div class="text-center">
          <button (click)="toggleTab()" class="text-blue-600">
            {{ tab === 'signin' ? 'Não tem conta? Criar' : 'Já tem conta? Entrar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .input { @apply w-full px-3 py-2 border border-gray-300 rounded-md; }
    .btn { @apply w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700; }
  `]
})
export class AuthComponent {
  tab: 'signin' | 'signup' = 'signin';
  form: FormGroup;
  loading = false;

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