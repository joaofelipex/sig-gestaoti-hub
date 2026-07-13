import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiService, MeResponse } from '../../services/api.service';
import { PermissionService, AppRole } from '../../services/permission.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal.component';

interface OrgUser {
  user_id: string;
  email: string;
  nome: string;
  role: AppRole;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Configurações</h1>
          <p class="app-page-sub">Conta, segurança e acesso à organização</p>
        </div>
      </header>

      <div *ngIf="loading" class="sig-page-loading">A carregar…</div>

      <ng-container *ngIf="!loading && me">
        <nav class="sig-tabs-nav" aria-label="Secções de configurações">
          <button type="button" [class.is-active]="tab === 'conta'" (click)="tab = 'conta'">Minha conta</button>
          <button
            *ngIf="permissions.isAdmin"
            type="button"
            [class.is-active]="tab === 'acesso'"
            (click)="openAccessTab()"
          >
            Controle de acesso
          </button>
        </nav>

        <!-- Conta -->
        <div *ngIf="tab === 'conta'" class="sig-settings-stack">
          <article class="sig-list-card sig-settings-block">
            <h2 class="sig-settings-block__title">Perfil</h2>
            <p class="sig-settings-block__hint">{{ me.profile.org_nome }} · {{ roleLabel(me.profile.role) }}</p>

            <div class="sig-settings-form">
              <label class="sig-settings-field">
                <span>Nome</span>
                <input type="text" class="app-field" [(ngModel)]="profile.nome" autocomplete="name" />
              </label>
              <label class="sig-settings-field">
                <span>E-mail</span>
                <input type="email" class="app-field" [(ngModel)]="profile.email" autocomplete="email" />
              </label>
              <div class="sig-settings-actions">
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  [disabled]="savingProfile || !profile.nome.trim() || !profile.email.trim()"
                  (click)="saveProfile()"
                >
                  {{ savingProfile ? 'A guardar…' : 'Guardar' }}
                </button>
              </div>
            </div>
          </article>

          <article class="sig-list-card sig-settings-block">
            <h2 class="sig-settings-block__title">Senha</h2>
            <p class="sig-settings-block__hint">Digite a nova senha e guarde — ela passa a valer de imediato</p>

            <div class="sig-settings-form">
              <label class="sig-settings-field">
                <span>Senha</span>
                <input type="password" class="app-field" [(ngModel)]="password" autocomplete="new-password" />
              </label>
              <div class="sig-settings-actions">
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  [disabled]="savingPassword || !password.trim()"
                  (click)="changePassword()"
                >
                  {{ savingPassword ? 'A alterar…' : 'Alterar senha' }}
                </button>
              </div>
            </div>
          </article>
        </div>

        <!-- Acesso -->
        <div *ngIf="tab === 'acesso' && permissions.isAdmin" class="sig-settings-stack">
          <article class="sig-list-card sig-settings-block">
            <div class="sig-settings-block__row">
              <div>
                <h2 class="sig-settings-block__title">Utilizadores</h2>
                <p class="sig-settings-block__hint">
                  Admin: tudo · Gestor: edita dados · Utilizador: só consulta
                </p>
              </div>
              <button type="button" class="btn btn-primary btn-sm" (click)="openNewUser()">
                <i class="fas fa-user-plus me-1" aria-hidden="true"></i>
                Novo utilizador
              </button>
            </div>

            <div *ngIf="usersLoading" class="sig-page-loading">A carregar utilizadores…</div>

            <div *ngIf="!usersLoading" class="sig-table-wrap">
              <table class="sig-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Papel</th>
                    <th class="text-end">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let u of users">
                    <td class="fw-medium">
                      {{ u.nome }}
                      <span *ngIf="u.user_id === me.user.id" class="sig-settings-you">você</span>
                    </td>
                    <td>{{ u.email }}</td>
                    <td>
                      <select
                        class="app-field sig-settings-role"
                        [ngModel]="u.role"
                        (ngModelChange)="changeRole(u, $event)"
                        [disabled]="savingUserId === u.user_id"
                      >
                        <option value="admin">Administrador</option>
                        <option value="gestor">Gestor</option>
                        <option value="usuario">Utilizador</option>
                      </select>
                    </td>
                    <td class="text-end">
                      <button type="button" class="sig-link-action" (click)="openResetPassword(u)">Redefinir senha</button>
                    </td>
                  </tr>
                  <tr *ngIf="!users.length">
                    <td colspan="4" class="sig-table-empty">Nenhum utilizador</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </ng-container>
    </section>

    <app-modal
      [open]="userModal"
      [title]="editingUser ? 'Redefinir senha' : 'Novo utilizador'"
      [saving]="savingUser"
      (close)="userModal = false"
      (save)="saveUserModal()"
    >
      <div class="sig-settings-form" *ngIf="!editingUser">
        <label class="sig-settings-field">
          <span>Nome *</span>
          <input type="text" class="app-field" [(ngModel)]="userForm.nome" />
        </label>
        <label class="sig-settings-field">
          <span>E-mail *</span>
          <input type="email" class="app-field" [(ngModel)]="userForm.email" />
        </label>
        <label class="sig-settings-field">
          <span>Senha temporária *</span>
          <input type="password" class="app-field" [(ngModel)]="userForm.password" autocomplete="new-password" />
        </label>
        <label class="sig-settings-field">
          <span>Papel</span>
          <select class="app-field" [(ngModel)]="userForm.role">
            <option value="usuario">Utilizador (consulta)</option>
            <option value="gestor">Gestor (edita dados)</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
      </div>
      <div class="sig-settings-form" *ngIf="editingUser">
        <p class="sig-settings-block__hint mb-3">Nova senha para <strong>{{ editingUser.nome }}</strong></p>
        <label class="sig-settings-field">
          <span>Nova senha *</span>
          <input type="password" class="app-field" [(ngModel)]="userForm.password" autocomplete="new-password" />
        </label>
      </div>
    </app-modal>
  `,
})
export class SettingsComponent implements OnInit {
  loading = true;
  savingProfile = false;
  savingPassword = false;
  usersLoading = false;
  savingUser = false;
  savingUserId: string | null = null;
  tab: 'conta' | 'acesso' = 'conta';

  me: MeResponse | null = null;
  profile = { nome: '', email: '' };
  password = '';

  users: OrgUser[] = [];
  userModal = false;
  editingUser: OrgUser | null = null;
  userForm: { nome: string; email: string; password: string; role: AppRole } = {
    nome: '',
    email: '',
    password: '',
    role: 'usuario',
  };

  constructor(
    private api: ApiService,
    readonly permissions: PermissionService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  roleLabel(role?: string | null): string {
    if (role === 'admin') return 'Administrador';
    if (role === 'gestor') return 'Gestor';
    return 'Utilizador';
  }

  openAccessTab(): void {
    this.tab = 'acesso';
    void this.loadUsers();
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      this.me = await firstValueFrom(this.api.me());
      this.profile = {
        nome: this.me.profile.nome || '',
        email: this.me.profile.email || '',
      };
      await this.permissions.refresh();
    } catch {
      this.toast.show({ title: 'Erro', description: 'Não foi possível carregar a conta.', variant: 'destructive' });
    } finally {
      this.loading = false;
    }
  }

  async saveProfile(): Promise<void> {
    const nome = this.profile.nome.trim();
    const email = this.profile.email.trim();
    if (!nome || !email) return;
    this.savingProfile = true;
    try {
      const res = await firstValueFrom(this.api.patchProfile({ nome, email }));
      if (this.me) this.me.profile = { ...this.me.profile, ...res.profile };
      this.api.emitAuthChange();
      this.toast.show({ title: 'Guardado', description: 'Perfil atualizado.' });
    } catch (err) {
      this.toast.show({ title: 'Erro', description: this.errMsg(err), variant: 'destructive' });
    } finally {
      this.savingProfile = false;
    }
  }

  async changePassword(): Promise<void> {
    const next = this.password.trim();
    if (next.length < 6) {
      this.toast.show({ title: 'Senha fraca', description: 'Use pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    this.savingPassword = true;
    try {
      await firstValueFrom(this.api.changePassword(next));
      this.password = '';
      this.toast.show({ title: 'Senha alterada', description: 'A nova senha já está ativa.' });
    } catch (err) {
      this.toast.show({ title: 'Erro', description: this.errMsg(err), variant: 'destructive' });
    } finally {
      this.savingPassword = false;
    }
  }

  private async loadUsers(): Promise<void> {
    if (!this.permissions.isAdmin) return;
    this.usersLoading = true;
    try {
      const res = await firstValueFrom(this.api.listOrgUsers());
      this.users = res.users as OrgUser[];
    } catch (err) {
      this.toast.show({ title: 'Erro', description: this.errMsg(err), variant: 'destructive' });
    } finally {
      this.usersLoading = false;
    }
  }

  openNewUser(): void {
    this.editingUser = null;
    this.userForm = { nome: '', email: '', password: '', role: 'usuario' };
    this.userModal = true;
  }

  openResetPassword(u: OrgUser): void {
    this.editingUser = u;
    this.userForm = { nome: u.nome, email: u.email, password: '', role: u.role };
    this.userModal = true;
  }

  async saveUserModal(): Promise<void> {
    if (this.editingUser) {
      if (this.userForm.password.length < 6) {
        this.toast.show({ title: 'Senha fraca', description: 'Use pelo menos 6 caracteres.', variant: 'destructive' });
        return;
      }
      this.savingUser = true;
      try {
        await firstValueFrom(this.api.updateOrgUser(this.editingUser.user_id, { password: this.userForm.password }));
        this.userModal = false;
        this.toast.show({ title: 'Senha redefinida', description: `Nova senha para ${this.editingUser.nome}.` });
      } catch (err) {
        this.toast.show({ title: 'Erro', description: this.errMsg(err), variant: 'destructive' });
      } finally {
        this.savingUser = false;
      }
      return;
    }

    if (!this.userForm.nome.trim() || !this.userForm.email.trim() || this.userForm.password.length < 6) {
      this.toast.show({
        title: 'Dados incompletos',
        description: 'Nome, e-mail e senha (mín. 6) são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    this.savingUser = true;
    try {
      await firstValueFrom(
        this.api.createOrgUser({
          nome: this.userForm.nome.trim(),
          email: this.userForm.email.trim(),
          password: this.userForm.password,
          role: this.userForm.role,
        }),
      );
      this.userModal = false;
      this.toast.show({ title: 'Utilizador criado', description: 'Acesso disponível com a senha definida.' });
      await this.loadUsers();
    } catch (err) {
      this.toast.show({ title: 'Erro', description: this.errMsg(err), variant: 'destructive' });
    } finally {
      this.savingUser = false;
    }
  }

  async changeRole(u: OrgUser, role: AppRole): Promise<void> {
    if (u.role === role) return;
    const prev = u.role;
    u.role = role;
    this.savingUserId = u.user_id;
    try {
      await firstValueFrom(this.api.updateOrgUser(u.user_id, { role }));
      this.toast.show({ title: 'Papel atualizado', description: `${u.nome} → ${this.roleLabel(role)}` });
      if (u.user_id === this.me?.user.id) {
        this.api.emitAuthChange();
        await this.permissions.refresh();
        if (this.me) this.me.profile.role = role;
      }
    } catch (err) {
      u.role = prev;
      this.toast.show({ title: 'Erro', description: this.errMsg(err), variant: 'destructive' });
    } finally {
      this.savingUserId = null;
    }
  }

  private errMsg(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { error?: string } | undefined;
      if (body?.error) return body.error;
      return err.message;
    }
    return 'Pedido falhou';
  }
}
