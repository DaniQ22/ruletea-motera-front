import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Assignment, ChecklistEntry, DrawStatus, Member } from '../models/club.models';

const API_BASE = environment.apiBase;

function adminHeaders(adminKey: string): { headers: HttpHeaders } {
  return { headers: new HttpHeaders({ 'x-admin-key': adminKey }) };
}

@Injectable({ providedIn: 'root' })
export class ClubApiService {
  constructor(private readonly http: HttpClient) {}

  getMembers(): Observable<Member[]> {
    return this.http.get<Member[]>(`${API_BASE}/members`);
  }

  addMember(name: string, keyword: string): Observable<Member> {
    return this.http.post<Member>(`${API_BASE}/members`, { name, keyword });
  }

  updateMemberKeyword(id: string, keyword: string): Observable<Member> {
    return this.http.patch<Member>(`${API_BASE}/members/${id}/keyword`, { keyword });
  }

  removeMember(id: string, adminKey: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/members/${id}`, adminHeaders(adminKey));
  }

  getDrawStatus(): Observable<DrawStatus> {
    return this.http.get<DrawStatus>(`${API_BASE}/draw/status`);
  }

  verifyAdmin(adminKey: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${API_BASE}/admin/verify`,
      {},
      adminHeaders(adminKey),
    );
  }

  performDraw(adminKey: string): Observable<Assignment[]> {
    return this.http.post<Assignment[]>(`${API_BASE}/draw`, {}, adminHeaders(adminKey));
  }

  resetDraw(adminKey: string): Observable<void> {
    return this.http.post<void>(`${API_BASE}/draw/reset`, {}, adminHeaders(adminKey));
  }

  completeRemaining(adminKey: string): Observable<Assignment[]> {
    return this.http.post<Assignment[]>(
      `${API_BASE}/draw/complete-remaining`,
      {},
      adminHeaders(adminKey),
    );
  }

  getChecklist(adminKey: string): Observable<ChecklistEntry[]> {
    return this.http.get<ChecklistEntry[]>(`${API_BASE}/draw/checklist`, adminHeaders(adminKey));
  }

  confirmAssignment(memberId: string, keyword: string): Observable<Assignment> {
    return this.http.get<Assignment>(
      `${API_BASE}/draw/${memberId}/confirm/${encodeURIComponent(keyword)}`,
    );
  }

  markRevealed(memberId: string): Observable<Assignment> {
    return this.http.post<Assignment>(`${API_BASE}/draw/${memberId}/reveal`, {});
  }
}
