import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ClubApiService } from '../../core/services/club-api.service';
import { Assignment, DrawStatus, Member } from '../../core/models/club.models';

interface WheelSlice {
  name: string;
  path: string;
  color: string;
  labelX: number;
  labelY: number;
  labelRotate: number;
}

interface SavedIdentity {
  memberId: string;
  phone: string;
}

const CX = 150;
const CY = 150;
const RADIUS = 138;
const LABEL_RADIUS = 96;
const PALETTE = ['#8b5cf6', '#38bdf8', '#34d399'];
const EXTRA_SPINS = 6;
const SPIN_DURATION_MS = 4400;
const STORAGE_KEY = 'cuervos-ruleta:identity';

function polarToCartesian(radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(angleRad),
    y: CY + radius * Math.sin(angleRad),
  };
}

function describeSlice(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(RADIUS, endAngle);
  const end = polarToCartesian(RADIUS, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', CX, CY,
    'L', start.x, start.y,
    'A', RADIUS, RADIUS, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

function readSavedIdentity(): SavedIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedIdentity) : null;
  } catch {
    return null;
  }
}

function saveIdentity(identity: SavedIdentity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* localStorage no disponible (modo privado, etc.) */
  }
}

function clearSavedIdentity(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

@Component({
  selector: 'app-ruleta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ruleta.component.html',
  styleUrl: './ruleta.component.scss',
})
export class RuletaComponent implements OnInit {
  members: Member[] = [];
  status: DrawStatus | null = null;

  selectedMemberId = '';
  phoneInput = '';
  confirming = false;
  identified: Assignment | null = null;

  slices: WheelSlice[] = [];
  rotation = 0;
  noTransition = false;
  spinning = false;
  revealedName: string | null = null;
  errorMsg = '';

  constructor(private readonly api: ClubApiService) {}

  ngOnInit(): void {
    this.api.getDrawStatus().subscribe((status) => (this.status = status));
    this.api.getMembers().subscribe((members) => {
      this.members = members;

      const saved = readSavedIdentity();
      if (saved && this.members.some((m) => m.id === saved.memberId)) {
        this.selectedMemberId = saved.memberId;
        this.phoneInput = saved.phone;
        this.confirm(saved.memberId, saved.phone, false);
      }
    });
  }

  onSelectMember(): void {
    this.identified = null;
    this.revealedName = null;
    this.rotation = 0;
    this.noTransition = false;
    this.slices = [];
    this.errorMsg = '';
  }

  onSubmitConfirm(): void {
    const phone = this.phoneInput.trim();
    if (!this.selectedMemberId || !phone) return;
    this.confirm(this.selectedMemberId, phone, true);
  }

  private confirm(memberId: string, phone: string, persist: boolean): void {
    this.confirming = true;
    this.errorMsg = '';

    this.api.confirmAssignment(memberId, phone).subscribe({
      next: (assignment) => {
        this.confirming = false;
        this.identified = assignment;
        if (persist) saveIdentity({ memberId, phone });

        this.buildWheel();
        if (assignment.revealed) {
          this.showRevealInstantly(assignment.receiverName);
        }
      },
      error: (err: unknown) => {
        this.confirming = false;
        if (persist) clearSavedIdentity();
        this.errorMsg =
          err instanceof HttpErrorResponse && err.error?.message
            ? err.error.message
            : 'No se pudo verificar tu teléfono.';
      },
    });
  }

  private buildWheel(): void {
    if (!this.identified) {
      this.slices = [];
      return;
    }
    const others = this.members.filter((m) => m.id !== this.identified!.giverId);
    const n = others.length;
    if (n === 0) {
      this.slices = [];
      return;
    }
    const anglePer = 360 / n;

    this.slices = others.map((member, i) => {
      const startAngle = i * anglePer;
      const endAngle = startAngle + anglePer;
      const midAngle = startAngle + anglePer / 2;
      const label = polarToCartesian(LABEL_RADIUS, midAngle);
      return {
        name: member.name,
        path: describeSlice(startAngle, endAngle),
        color: PALETTE[i % PALETTE.length],
        labelX: label.x,
        labelY: label.y,
        labelRotate: midAngle,
      };
    });
  }

  private showRevealInstantly(receiverName: string): void {
    const index = this.slices.findIndex((s) => s.name === receiverName);
    if (index === -1) return;

    const anglePer = 360 / this.slices.length;
    const targetAngle = index * anglePer + anglePer / 2;

    this.noTransition = true;
    this.rotation = -targetAngle;
    this.revealedName = receiverName;
  }

  spin(): void {
    if (!this.identified || this.spinning || this.revealedName) return;

    const { giverId, receiverName } = this.identified;
    const index = this.slices.findIndex((s) => s.name === receiverName);
    if (index === -1) {
      this.errorMsg = 'No se encontró tu compañero en la ruleta.';
      return;
    }

    this.spinning = true;
    this.errorMsg = '';

    const anglePer = 360 / this.slices.length;
    const jitter = (Math.random() - 0.5) * anglePer * 0.6;
    const targetAngle = index * anglePer + anglePer / 2 + jitter;
    this.rotation = EXTRA_SPINS * 360 - targetAngle;

    setTimeout(() => {
      this.revealedName = receiverName;
      this.spinning = false;
      this.api.markRevealed(giverId).subscribe();
    }, SPIN_DURATION_MS);
  }

  changeMember(): void {
    clearSavedIdentity();
    this.selectedMemberId = '';
    this.phoneInput = '';
    this.identified = null;
    this.slices = [];
    this.revealedName = null;
    this.rotation = 0;
    this.noTransition = false;
    this.errorMsg = '';
  }
}
