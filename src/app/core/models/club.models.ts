export interface Member {
  id: string;
  name: string;
  phone: string | null;
  createdAt: string;
}

export interface Assignment {
  id: string;
  giverId: string;
  giverName: string;
  receiverId: string;
  receiverName: string;
  revealed: boolean;
  createdAt: string;
}

export interface DrawStatus {
  totalMembers: number;
  drawDone: boolean;
  minRequired: number;
}

export interface ChecklistEntry {
  id: string;
  name: string;
  hasPartner: boolean;
  revealed: boolean;
}
