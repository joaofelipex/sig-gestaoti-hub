import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, MeResponse } from '../../services/api.service';
import { SweetAlertService } from '../../services/sweetalert.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="sig-page">
      <div class="app-page-header">
        <div>
          <h1 class="app-page-title">Configurações</h1>
          <p class="app-page-sub">Gerir o seu perfil, conta e segurança</p>
        </div>
      </div>

      <div *ngIf="loading" class="sig-page-loading">A carregar perfil…</div>

      <ng-container *ngIf="!loading && me">
        <div class="sig-settings-grid">
          <!-- Perfil -->
          <article class="app-card sig-settings-card">
            <div class="sig-settings-card__head">
              <div class="sig-settings-avatar">
                <img *ngIf="profileForm.value.avatar_url" [src]="profileForm.value.avatar_url" alt="" />
                <span *ngIf="!profileForm.value.avatar_url">{{ initials }}</span>
              </div>
              <div>
                <h2 class="sig-settings-card__title">Perfil</h2>
                <p class="sig-settings-card__sub">Nome, e-mail e foto de avatar</p>
              </div>
            </div>

            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="sig-settings-form">
              <label class="sig-settings-field">
                <span>Nome</span>
                <input type="text" formControlName="nome" class="app-field" autocomplete="name" />
              </label>
              <label class="sig-settings-field">
                <span>E-mail</span>
                <input type="email" formControlName="email" class="app-field" autocomplete="email" />
              </label>
              <label class="sig-settings-field">
                <span>URL do avatar</span>
                <input type="url" formControlName="avatar_url" class="app-field" placeholder="https://…" />
                <small>Link para imagem (opcional)</small>
              </label>
              <div class="sig-settings-actions">
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="savingProfile || profileForm.invalid || profileForm.pristine">
                  <i class="fas fa-save me-1" aria-hidden="true"></i>
                  {{ savingProfile ? 'A guardar…' : 'Guardar perfil' }}
                </button>
              </div>
            </form>
          </article>

          <!-- Conta (read-only) -->
          <article class="app-card sig-settings-card">
            <div class="sig-settings-card__head">
              <div class="sig-settings-avatar sig-settings-avatar--muted">
                <i class="fas fa-building" aria-hidden="true"></i>
              </div>
              <div>
                <h2 class="sig-settings-card__title">Conta &amp; organização</h2>
                <p class="sig-settings-card__sub">Informações da sua conta no sistema</p>
              </div>
            </div>

            <dl class="sig-settings-dl">
              <div>
                <dt>Organização</dt>
                <dd>{{ me.profile.org_nome || '—' }}</dd>
              </div>
              <div>
                <dt>E-mail da conta</dt>
                <dd>{{ me.profile.email }}</dd>
              </div>
              <div>
                <dt>ID do utilizador</dt>
                <dd><code class="sig-settings-code">{{ me.user.id }}</code></dd>
              </div>
            </dl>
          </article>

          <!-- Senha -->
          <article class="app-card sig-settings-card sig-settings-card--wide">
            <div class="sig-settings-card__head">
              <div class="sig-settings-avatar sig-settings-avatar--muted">
                <i class="fas fa-lock" aria-hidden="true"></i>
              </div>
              <div>
                <h2 class="sig-settings-card__title">Segurança</h2>
                <p class="sig-settings-card__sub">Alterar a sua senha de acesso</p>
              </div>
            </div>

            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="sig-settings-form sig-settings-form--password">
              <label class="sig-settings-field">
                <span>Senha atual</span>
                <input type="password" formControlName="currentPassword" class="app-field" autocomplete="current-password" />
              </label>
              <label class="sig-settings-field">
                <span>Nova senha</span>
                <input type="password" formControlName="newPassword" class="app-field" autocomplete="new-password" />
                <small>Mínimo de 6 caracteres</small>
              </label>
              <label class="sig-settings-field">
                <span>Confirmar nova senha</span>
                <input type="password" formControlName="confirmPassword" class="app-field" autocomplete="new-password" />
              </label>
              <div class="sig-settings-actions">
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="savingPassword || passwordForm.invalid">
                  <i class="fas fa-key me-1" aria-hidden="true"></i>
                  {{ savingPassword ? 'A alterar…' : 'Alterar senha' }}
                </button>
              </div>
            </form>
          </article>
        </div>
      </ng-container>
    </section>
  `,
})
export class SettingsComponent implements OnInit {
  loading = true;
  savingProfile = false;
  savingPassword = false;
  me: MeResponse | null = null;

  profileForm: FormGroup;
  passwordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private swal: SweetAlertService,
  ) {
    this.profileForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      avatar_url: [''],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  ngOnInit(): void {
    void this.load();
  }

  get initials(): string {
    const nome = this.profileForm.value.nome as string;
    if (!nome?.trim()) return '?';
    const parts = nome.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }

  private passwordMatchValidator(group: FormGroup): { mismatch: boolean } | null {
    const np = group.get('newPassword')?.value;
    const cp = group.get('confirmPassword')?.value;
    return np && cp && np !== cp ? { mismatch: true } : null;
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      this.me = await firstValueFrom(this.api.me());
      this.profileForm.patchValue({
        nome: this.me.profile.nome,
        email: this.me.profile.email,
        avatar_url: this.me.profile.avatar_url ?? '',
      });
      this.profileForm.markAsPristine();
    } catch {
      await this.swal.error('Erro', 'Não foi possível carregar o perfil.');
    } finally {
      this.loading = false;
    }
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid || this.profileForm.pristine) return;
    this.savingProfile = true;
    const { nome, email, avatar_url } = this.profileForm.value;
    try {
      const res = await firstValueFrom(
        this.api.patchProfile({
          nome: String(nome).trim(),
          email: String(email).trim(),
          avatar_url: avatar_url ? String(avatar_url).trim() : null,
        }),
      );
      if (this.me) {
        this.me.profile = { ...this.me.profile, ...res.profile };
      }
      this.profileForm.markAsPristine();
      this.api.emitAuthChange();
      this.swal.toast('Perfil atualizado');
    } catch (err: unknown) {
      await this.swal.error('Erro', this.extractError(err, 'Não foi possível guardar o perfil.'));
    } finally {
      this.savingProfile = false;
    }
  }

  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      if (this.passwordForm.errors?.['mismatch']) {
        await this.swal.warning('Atenção', 'A confirmação da senha não coincide.');
      }
      return;
    }
    this.savingPassword = true;
    const { currentPassword, newPassword } = this.passwordForm.value;
    try {
      await firstValueFrom(this.api.changePassword(currentPassword, newPassword));
      this.passwordForm.reset();
      this.swal.toast('Senha alterada com sucesso');
    } catch (err: unknown) {
      await this.swal.error('Erro', this.extractError(err, 'Não foi possível alterar a senha.'));
    } finally {
      this.savingPassword = false;
    }
  }

  private extractError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error: unknown }).error;
      if (body && typeof body === 'object' && 'error' in body) {
        return String((body as { error: string }).error);
      }
    }
    return fallback;
  }
}
