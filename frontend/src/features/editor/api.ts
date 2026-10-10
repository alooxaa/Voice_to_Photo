import { apiBlob } from '../../shared/api/client';

/** Send the picture to the backend's local model; get it back with a transparent background. */
export function removeBackground(image: Blob): Promise<Blob> {
  const form = new FormData();
  form.append('image', image, 'photo.png');
  return apiBlob('ai/remove-background/', { method: 'POST', body: form });
}
