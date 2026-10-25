import type { Course, Topic } from '@app/api/client';

export function flattenTopics(course: Course): Topic[] {
  return course.modules.flatMap((module) => module.topics);
}

export interface Neighbors {
  index: number;
  current: Topic;
  prev: Topic | null;
  next: Topic | null;
  total: number;
}

export function getNeighbors(
  topics: Topic[],
  topicId: string,
): Neighbors | null {
  let prev: Topic | null = null;
  let index: number | null = null;
  let next: Topic | null = null;

  for (let i = 0; i < topics.length; i++) {
    if (topicId === topics[i].meta.id) {
      index = i;
      prev = i - 1 < 0 ? null : topics[i - 1];
      next = i + 1 >= topics.length ? null : topics[i + 1];
      break;
    }
  }

  if (index === null) return null;
  return { index, current: topics[index], prev, next, total: topics.length };
}
