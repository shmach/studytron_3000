import type { Course, TopicStatus } from '@/api/client'

export interface CourseProgress {
  totalTopics: number
  completedTopics: number
  /** Count of topics per status, always including every status key. */
  byStatus: Record<TopicStatus, number>
  /** 0-100, rounded. */
  percent: number
}

const EMPTY_STATUS_COUNT: Record<TopicStatus, number> = {
  pending: 0,
  in_progress: 0,
  completed: 0,
  review: 0,
}

/** Aggregate topic-meta status across all modules of a course. */
export function computeProgress(course: Course): CourseProgress {
  const byStatus = { ...EMPTY_STATUS_COUNT }
  let totalTopics = 0

  for (const module of course.modules) {
    for (const topic of module.topics) {
      totalTopics += 1
      byStatus[topic.meta.status] += 1
    }
  }

  const completedTopics = byStatus.completed
  const percent = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100)

  return { totalTopics, completedTopics, byStatus, percent }
}
