import { createCourseJob } from '@app/api/queries';
import { useMutation } from '@tanstack/react-query';

export function useCreateCourse() {
  return useMutation({ mutationFn: createCourseJob });
}
