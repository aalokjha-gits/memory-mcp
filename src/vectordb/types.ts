export interface MemoryPayload {
  id: string;
  content: string;
  type: string;
  tags?: string[];
  project?: string;
  importance: number;
  timestamp: string;
  linked_ids?: string[];
}

export interface ProfilePayload {
  key: string;
  value: string;
  timestamp: string;
}
