import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ClubApiService } from '../../core/services/club-api.service';
import { ChecklistEntry, DrawStatus, Member } from '../../core/models/club.models';

const ADMIN_STORAGE_KEY = 'cuervos-ruleta:admin-key';

function readSavedAdminKey(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveAdminKey(key: string): void {
  try {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, key);
  } catch {
    /* noop */
  }
}

function clearAdminKey(): void {
  try {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

@Component({
  selector: 'app-miembros',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './miembros.component.html',
  styleUrl: './miembros.component.scss',
})
export class MiembrosComponent implements OnInit {
  members: Member[] = [];
  status: DrawStatus | null = null;

  newName = '';
  newPhone = '';
  loading = false;
  errorMsg = '';
  successMsg = '';

  phoneDraftByMember: Record<string, string | undefined> = {};
  savingPhoneFor: string | null = null;

  isAdmin = false;
  adminKeyInput = '';
  adminError = '';
  private adminKey = '';

  checklist: ChecklistEntry[] = [];

  constructor(private readonly api: ClubApiService) {}

  ngOnInit(): void {
    this.refresh();

    const savedKey = readSavedAdminKey();
    if (savedKey) {
      this.api.verifyAdmin(savedKey).subscribe({
        next: () => {
          this.adminKey = savedKey;
          this.isAdmin = true;
          this.loadChecklist();
        },
        error: () => clearAdminKey(),
      });
    }
  }

  private loadChecklist(): void {
    if (!this.isAdmin) return;
    this.api.getChecklist(this.adminKey).subscribe((checklist) => (this.checklist = checklist));
  }

  private refresh(): void {
    this.api.getMembers().subscribe((members) => (this.members = members));
    this.api.getDrawStatus().subscribe((status) => (this.status = status));
  }

  private showError(err: unknown): void {
    const message =
      err instanceof HttpErrorResponse
        ? err.error?.message ?? 'Algo se atascó en el motor. Intenta de nuevo.'
        : 'Algo se atascó en el motor. Intenta de nuevo.';
    this.errorMsg = Array.isArray(message) ? message.join(', ') : message;
    this.successMsg = '';
  }

  addMember(): void {
    const name = this.newName.trim();
    const phone = this.newPhone.trim();
    if (!name || !phone) return;

    this.loading = true;
    this.errorMsg = '';
    this.api.addMember(name, phone).subscribe({
      next: (member) => {
        this.members = [...this.members, member];
        this.newName = '';
        this.newPhone = '';
        this.loading = false;
        this.refresh();
        this.loadChecklist();
      },
      error: (err) => {
        this.loading = false;
        this.showError(err);
      },
    });
  }

  savePhone(member: Member): void {
    const phone = (this.phoneDraftByMember[member.id] ?? '').trim();
    if (!phone) return;

    this.savingPhoneFor = member.id;
    this.errorMsg = '';
    this.api.updateMemberPhone(member.id, phone).subscribe({
      next: (updated) => {
        this.members = this.members.map((m) => (m.id === updated.id ? updated : m));
        delete this.phoneDraftByMember[member.id];
        this.savingPhoneFor = null;
      },
      error: (err) => {
        this.savingPhoneFor = null;
        this.showError(err);
      },
    });
  }

  removeMember(member: Member): void {
    if (!this.isAdmin) return;
    if (!confirm(`¿Quitar a ${member.name} de la lista del sorteo?`)) return;

    this.errorMsg = '';
    this.api.removeMember(member.id, this.adminKey).subscribe({
      next: () => {
        this.members = this.members.filter((m) => m.id !== member.id);
        this.refresh();
        this.loadChecklist();
      },
      error: (err) => this.showError(err),
    });
  }

  unlockAdmin(): void {
    const key = this.adminKeyInput.trim();
    if (!key) return;

    this.adminError = '';
    this.api.verifyAdmin(key).subscribe({
      next: () => {
        this.adminKey = key;
        this.isAdmin = true;
        this.adminKeyInput = '';
        saveAdminKey(key);
        this.loadChecklist();
      },
      error: () => {
        this.adminError = 'Contraseña de administrador incorrecta.';
      },
    });
  }

  lockAdmin(): void {
    this.isAdmin = false;
    this.adminKey = '';
    this.checklist = [];
    clearAdminKey();
  }

  runDraw(): void {
    if (!this.isAdmin) return;
    if (
      !confirm(
        '¿Arrancar el sorteo? Una vez girado, las parejas quedan fijas hasta que reinicies.',
      )
    ) {
      return;
    }

    this.errorMsg = '';
    this.api.performDraw(this.adminKey).subscribe({
      next: () => {
        this.successMsg =
          '¡Sorteo listo! Cada quien puede ir a la Ruleta a descubrir a su compañero.';
        this.refresh();
        this.loadChecklist();
      },
      error: (err) => this.showError(err),
    });
  }

  resetDraw(): void {
    if (!this.isAdmin) return;
    if (
      !confirm(
        'Esto borra las parejas actuales para poder sortear de nuevo. ¿Seguro?',
      )
    ) {
      return;
    }

    this.api.resetDraw(this.adminKey).subscribe({
      next: () => {
        this.successMsg = 'Sorteo reiniciado. Ya puedes girar de nuevo.';
        this.refresh();
        this.loadChecklist();
      },
      error: (err) => this.showError(err),
    });
  }

  completeRemaining(): void {
    if (!this.isAdmin) return;
    if (
      !confirm(
        '¿Emparejar entre sí a los pilotos que todavía no tienen pareja? Los que ya tienen pareja no se tocan.',
      )
    ) {
      return;
    }

    this.errorMsg = '';
    this.api.completeRemaining(this.adminKey).subscribe({
      next: () => {
        this.successMsg = 'Listo, los rezagados ya tienen pareja.';
        this.refresh();
        this.loadChecklist();
      },
      error: (err) => this.showError(err),
    });
  }

  get canDraw(): boolean {
    return !!this.status && !this.status.drawDone && this.status.totalMembers >= this.status.minRequired;
  }

  get pendingCount(): number {
    return this.checklist.filter((c) => !c.hasPartner).length;
  }
}
