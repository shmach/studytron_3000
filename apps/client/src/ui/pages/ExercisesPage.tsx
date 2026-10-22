import { useParams } from 'react-router';

// Placeholder: the real exercises page is implemented in a later plan step.
export function ExercisesPage() {
  const { slug, topicId } = useParams<{ slug: string; topicId: string }>();

  return (
    <p className="font-mono text-sm">
      exercises: {slug} / {topicId}
    </p>
  );
}
