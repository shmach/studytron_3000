import type { CourseBundle } from '@app/api/client';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function filterCourses(
  bundles: CourseBundle[],
  query: string,
): CourseBundle[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return bundles;

  return bundles.filter(({ course }) => {
    const haystack = normalize(
      [course.course, course.slug, course.goal].join(' '),
    );

    return terms.every((term) => haystack.includes(term));
  });
}
