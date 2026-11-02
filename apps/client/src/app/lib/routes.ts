/**
 * Single source of truth for URLs built from course data, so links and the
 * router definition (src/router) cannot drift apart.
 */
export const coursePath = (slug: string) =>
  `/courses/${encodeURIComponent(slug)}`;

export const topicPath = (slug: string, topicId: string) =>
  `${coursePath(slug)}/topics/${encodeURIComponent(topicId)}`;

export const exercisesPath = (slug: string, topicId: string) =>
  `${topicPath(slug, topicId)}/exercises`;
