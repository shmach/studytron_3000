import { useState, type MouseEvent } from 'react';
import { Trash2 } from 'lucide-react';

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
          Excluir curso
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir o curso “{courseName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é <strong>irreversível</strong>. O cronograma, as aulas,
            os exercícios e as tentativas deste curso serão apagados
            permanentemente do vault. Confirme que deseja excluir o curso.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-destructive text-sm" role="alert">
            Não foi possível excluir o curso: {error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? 'Excluindo…' : 'Excluir definitivamente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
