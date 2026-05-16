import { getCollection, type CollectionEntry } from 'astro:content';

export type Edition = CollectionEntry<'editions'>;

/** Devuelve todas las ediciones ordenadas por año descendiente. */
export async function getAllEditions(): Promise<Edition[]> {
  const editions = await getCollection('editions');
  return editions.sort((a, b) => b.data.year - a.data.year);
}

/** Devuelve la edición destacada (featured: true) o, en su defecto, la más reciente. */
export async function getFeaturedEdition(): Promise<Edition> {
  const editions = await getAllEditions();
  const featured = editions.find((e) => e.data.featured);
  return featured ?? editions[0];
}

/** Devuelve sólo las ediciones pasadas, ordenadas más recientes primero. */
export async function getPastEditions(): Promise<Edition[]> {
  const editions = await getAllEditions();
  return editions.filter((e) => e.data.status === 'past');
}

/** Devuelve la edición de un año dado o `undefined`. */
export async function getEditionByYear(year: number | string): Promise<Edition | undefined> {
  const editions = await getAllEditions();
  const target = typeof year === 'string' ? parseInt(year, 10) : year;
  return editions.find((e) => e.data.year === target);
}
