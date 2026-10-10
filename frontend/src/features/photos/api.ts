import { api } from '../../shared/api/client';

export interface Photo {
  id: number;
  title: string;
  original_url: string;
  edited_url: string | null;
  has_chat: boolean;
  created: string;
  updated: string;
}

/**
 * The newest version of a photo: the saved edit if there is one. The edit's
 * file name can repeat between saves, so the update time keeps caches fresh.
 */
export function latestImage(photo: Photo): string {
  if (!photo.edited_url) return photo.original_url;
  return `${photo.edited_url}?v=${Date.parse(photo.updated)}`;
}

export const photosApi = {
  list: () => api<Photo[]>('photos/'),

  get: (id: number) => api<Photo>(`photos/${id}/`),

  upload: (file: File) => {
    const form = new FormData();
    form.append('original', file);
    return api<Photo>('photos/', { method: 'POST', body: form });
  },

  saveEdited: (id: number, image: Blob) => {
    const form = new FormData();
    form.append('image', image, `photo-${id}.png`);
    return api<Photo>(`photos/${id}/save/`, { method: 'POST', body: form });
  },
};
