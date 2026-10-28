import { useTranslation } from 'react-i18next';

const REPO_URL = 'https://github.com/shmach/studytron_3000';
const AUTHOR_URL = 'https://github.com/shmach';

// lucide-react no longer ships brand icons, so the GitHub mark is inlined.
function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur">
      <div className="text-muted-foreground mx-auto flex h-11 max-w-5xl items-center justify-between gap-4 px-4 text-xs">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <GithubMark className="size-4" />
          {t('footer.repository')}
        </a>
        <span>
          {t('footer.madeBy')}{' '}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-linear-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text font-semibold text-transparent hover:opacity-80"
          >
            @shmach
          </a>
        </span>
      </div>
    </footer>
  );
}
