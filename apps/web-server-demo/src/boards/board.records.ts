export interface BoardRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface BoardListRecord {
  id: string;
  boardId: string;
  name: string;
  position: number;
  createdAt: string;
}
