import { useParams } from 'react-router';

// Placeholder: the real lesson page is implemented in the next plan step.
export function LessonPage() {
  const { slug, topicId } = useParams<{ slug: string; topicId: string }>();

  return (
    <p className="font-mono text-sm">
      lesson: {slug} / {topicId}
    </p>
  );
}
