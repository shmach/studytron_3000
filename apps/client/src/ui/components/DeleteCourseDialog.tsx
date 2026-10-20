import { useState, type MouseEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { useDeleteCourse } from '@app/hooks/useDeleteCourse';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ui/components/ui/AlertDialog';
import { Button } from '@ui/components/ui/Button';

interface DeleteCourseDialogProps {
  slug: string;
  courseName: string;
  onDeleted: () => void;
}

export function DeleteCourseDialog({
  slug,
  courseName,
  onDeleted,
}: DeleteCourseDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { mutate, isPending, error, reset } = useDeleteCourse();

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    if (!nextOpen) reset();
    setOpen(nextOpen);
  }

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    mutate(slug, {
      onSuccess: () => {
        setOpen(false);
        onDeleted();
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 />
          {t('deleteCourse.trigger')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('deleteCourse.title', { name: courseName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans
              i18nKey="deleteCourse.description"
              components={{ strong: <strong /> }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {t('deleteCourse.error', { message: error.message })}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? t('deleteCourse.deleting') : t('deleteCourse.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
