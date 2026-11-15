import { useMutation, useQueryClient } from '@tanstack/react-query';

import { courseKeys, settingsKeys, updateSettings } from '@app/api/queries';

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings) => {
      // The server answers with the settings as they are now: no need to fetch them again.
      queryClient.setQueryData(settingsKeys.all, settings);
      // A different vault holds different courses.
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}
