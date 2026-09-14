import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ClubApiService } from '../../core/services/club-api.service';
import { Assignment, ChecklistEntry, DrawStatus, Member } from '../../core/models/club.models';

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
  newKeyword = '';
  loading = false;
  errorMsg = '';
  successMsg = '';

  keywordDraftByMember: Record<string, string | undefined> = {};
  savingKeywordFor: string | null = null;

  searchQuery = '';
  currentPage = 1;
  readonly pageSize = 12;

  isAdmin = false;
  adminKeyInput = '';
  adminError = '';
  private adminKey = '';

  checklist: ChecklistEntry[] = [];

  pairs: Assignment[] = [];
  showingPairs = false;
  loadingPairs = false;

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
    const keyword = this.newKeyword.trim();
    if (!name || !keyword) return;

    this.loading = true;
    this.errorMsg = '';
    this.api.addMember(name, keyword).subscribe({
      next: (member) => {
        this.members = [...this.members, member];
        this.newName = '';
        this.newKeyword = '';
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

  saveKeyword(member: Member): void {
    const keyword = (this.keywordDraftByMember[member.id] ?? '').trim();
    if (!keyword) return;

    this.savingKeywordFor = member.id;
    this.errorMsg = '';
    this.api.updateMemberKeyword(member.id, keyword).subscribe({
      next: (updated) => {
        this.members = this.members.map((m) => (m.id === updated.id ? updated : m));
        delete this.keywordDraftByMember[member.id];
        this.savingKeywordFor = null;
      },
      error: (err) => {
        this.savingKeywordFor = null;
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
    this.pairs = [];
    this.showingPairs = false;
    clearAdminKey();
  }

  toggleEmergencyPairs(): void {
    if (!this.isAdmin) return;

    if (this.showingPairs) {
      this.showingPairs = false;
      this.pairs = [];
      return;
    }

    if (
      !confirm(
        '⚠️ Esto revela quién le tocó a quién. Úsalo solo en caso de emergencia. ¿Continuar?',
      )
    ) {
      return;
    }

    this.loadingPairs = true;
    this.errorMsg = '';
    this.api.getPairs(this.adminKey).subscribe({
      next: (pairs) => {
        this.pairs = pairs;
        this.showingPairs = true;
        this.loadingPairs = false;
      },
      error: (err) => {
        this.loadingPairs = false;
        this.showError(err);
      },
    });
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

  onSearchChange(): void {
    this.currentPage = 1;
  }

  get filteredMembers(): Member[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.members;
    return this.members.filter((m) => m.name.toLowerCase().includes(query));
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMembers.length / this.pageSize));
  }

  get currentPageSafe(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get pagedMembers(): Member[] {
    const start = (this.currentPageSafe - 1) * this.pageSize;
    return this.filteredMembers.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(Math.max(1, page), this.totalPages);
  }

  prevPage(): void {
    this.goToPage(this.currentPageSafe - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPageSafe + 1);
  }
}
