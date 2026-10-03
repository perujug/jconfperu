import { getCollection, type CollectionEntry } from 'astro:content';

export type Edition = CollectionEntry<'editions'>;

/** Devuelve todas las ediciones ordenadas por año descendiente. */
export async function getAllEditions(): Promise<Edition[]> {
  const editions = await getCollection('editions');
  return editions.sort((a, b) => b.data.year - a.data.year);
}

/** Devuelve la única edición destacada. La build falla si el contenido es ambiguo. */
export async function getFeaturedEdition(): Promise<Edition> {
  const editions = await getAllEditions();
  const featured = editions.filter((edition) => edition.data.featured);

  if (featured.length !== 1) {
    const years = featured.map((edition) => edition.data.year).join(', ') || 'ninguna';
    throw new Error(
      `[content] Debe existir exactamente una edición con featured: true; encontradas: ${years}.`,
    );
  }

  return featured[0];
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
