import type { TFunction } from 'i18next';

import type { Photo } from './api';

/** Sample photos are titled in the current language; uploads keep the title they were given. */
export function photoTitle(photo: Photo, t: TFunction): string {
  return photo.title_key
    ? t(`samples.${photo.title_key}`, { defaultValue: photo.title })
    : photo.title;
}
