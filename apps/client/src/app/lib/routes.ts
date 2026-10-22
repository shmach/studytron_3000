/**
 * Single source of truth for URLs built from course data, so links and the
 * router definition (src/router) cannot drift apart.
 */
export const topicPath = (slug: string, topicId: string) =>
  `/courses/${encodeURIComponent(slug)}/topics/${encodeURIComponent(topicId)}`;

export const exercisesPath = (slug: string, topicId: string) =>
  `${topicPath(slug, topicId)}/exercises`;
