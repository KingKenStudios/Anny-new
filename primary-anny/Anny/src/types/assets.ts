export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'font' | 'other';
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
}
