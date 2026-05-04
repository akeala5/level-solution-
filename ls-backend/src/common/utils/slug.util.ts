import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

export function generateSlug(text: string, unique = true): string {
  const base = slugify(text, {
    lower: true,
    strict: true,
    locale: 'fr',
    trim: true,
  });
  if (unique) {
    const suffix = uuidv4().split('-')[0];
    return `${base}-${suffix}`;
  }
  return base;
}
