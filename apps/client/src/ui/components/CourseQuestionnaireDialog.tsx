import type { ReactNode, SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ui/components/ui/AlertDialog';
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from '@ui/components/ui/Questionnaire';

const DEFAULT_LEVEL = 'beginner';

function buildPrompt(topic: string, answers: FormData): string {
  const value = (name: string) => {
    const raw = answers.get(name);
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  };
  const focus = answers
    .getAll('focus')
    .filter((item): item is string => typeof item === 'string' && !!item);

  const lines = [
    `Create a course about: ${topic.trim()}`,
    `Student level: ${value('level') ?? DEFAULT_LEVEL}`,
    `Depth: ${value('depth') ?? 'standard'}`,
  ];
  const goal = value('goal');
  if (goal) lines.push(`Goal: ${goal}`);
  if (focus.length > 0) lines.push(`Emphasis: ${focus.join(', ')}`);
  const language = value('language');
  if (language) lines.push(`Language: ${language}`);

  return lines.join('\n');
}

interface CourseQuestionnaireDialogProps {
  topic: string;
  onSubmit: (prompt: string) => void;
  children: ReactNode;
  open: boolean;
  setOpenDialog: (state: boolean) => void;
}

export function CourseQuestionnaireDialog({
  topic,
  onSubmit,
  children,
  open,
  setOpenDialog,
}: CourseQuestionnaireDialogProps) {
  const { t } = useTranslation();

  // `value` is what goes into the generated prompt and stays in English for the API;
  // `label` is what the user sees and is translated.
  const questions = [
    {
      name: 'level',
      required: true,
      title: t('questionnaire.level.title'),
      description: t('questionnaire.level.description'),
      choices: [
        { value: 'beginner', label: t('questionnaire.level.beginner') },
        { value: 'intermediate', label: t('questionnaire.level.intermediate') },
        { value: 'advanced', label: t('questionnaire.level.advanced') },
      ],
    },
    {
      name: 'depth',
      required: true,
      title: t('questionnaire.depth.title'),
      description: t('questionnaire.depth.description'),
      choices: [
        {
          value: 'quick',
          label: t('questionnaire.depth.quick'),
          hint: t('questionnaire.depth.quickHint'),
        },
        {
          value: 'standard',
          label: t('questionnaire.depth.standard'),
          hint: t('questionnaire.depth.standardHint'),
        },
        {
          value: 'deep',
          label: t('questionnaire.depth.deep'),
          hint: t('questionnaire.depth.deepHint'),
        },
      ],
    },
    {
      name: 'goal',
      required: false,
      title: t('questionnaire.goal.title'),
      description: t('questionnaire.goal.description'),
      choices: [
        {
          value: 'get a job or career change',
          label: t('questionnaire.goal.career'),
        },
        {
          value: 'build a personal project',
          label: t('questionnaire.goal.project'),
        },
        {
          value: 'general knowledge and curiosity',
          label: t('questionnaire.goal.curiosity'),
        },
      ],
      input: {
        label: t('questionnaire.goal.otherLabel'),
        placeholder: t('questionnaire.goal.otherPlaceholder'),
      },
    },
    {
      name: 'focus',
      required: false,
      title: t('questionnaire.focus.title'),
      description: t('questionnaire.focus.description'),
      multiple: true,
      choices: [
        {
          value: 'theory and concepts',
          label: t('questionnaire.focus.theory'),
        },
        {
          value: 'hands-on practice',
          label: t('questionnaire.focus.practice'),
        },
        {
          value: 'real-world examples',
          label: t('questionnaire.focus.examples'),
        },
        {
          value: 'exercises with feedback',
          label: t('questionnaire.focus.exercises'),
        },
      ],
    },
    {
      name: 'language',
      required: true,
      title: t('questionnaire.language.title'),
      description: t('questionnaire.language.description'),
      // Language names are shown in their own language, so they are not translated.
      choices: [
        { value: 'Portuguese (pt-BR)', label: 'Português' },
        { value: 'English', label: 'English' },
      ],
    },
  ];

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(buildPrompt(topic, new FormData(event.currentTarget)));
    setOpenDialog(false);
  }

  return (
    <AlertDialog onOpenChange={setOpenDialog} open={open}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="gap-2">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('questionnaire.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {topic.trim()
              ? t('questionnaire.descriptionWithTopic', { topic: topic.trim() })
              : t('questionnaire.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Questionnaire
          defaultItem={questions[0].name}
          items={questions}
          onSubmit={handleSubmit}
        >
          <QuestionnaireProgress />
          {questions.map((question) => (
            <QuestionnaireItem
              key={question.name}
              name={question.name}
              multiple={'multiple' in question && question.multiple}
              required={question.required}
            >
              <QuestionnaireTitle>{question.title}</QuestionnaireTitle>
              <QuestionnaireDescription>
                {question.description}
              </QuestionnaireDescription>
              <QuestionnaireChoices>
                {question.choices.map((choice) => (
                  <QuestionnaireChoice key={choice.value} value={choice.value}>
                    <span className="font-medium">{choice.label}</span>
                    {'hint' in choice ? (
                      <span className="text-muted-foreground">
                        {choice.hint}
                      </span>
                    ) : null}
                  </QuestionnaireChoice>
                ))}
                {question.input ? (
                  <QuestionnaireInput
                    aria-label={question.input.label}
                    placeholder={question.input.placeholder}
                  />
                ) : null}
              </QuestionnaireChoices>
              <QuestionnaireError />
            </QuestionnaireItem>
          ))}
          <QuestionnaireActions>
            <QuestionnairePrevious>
              {t('questionnaire.previous')}
            </QuestionnairePrevious>
            <QuestionnaireSkip>{t('questionnaire.skip')}</QuestionnaireSkip>
            <QuestionnaireNext>{t('questionnaire.next')}</QuestionnaireNext>
            <QuestionnaireSubmit>
              {t('questionnaire.submit')}
            </QuestionnaireSubmit>
          </QuestionnaireActions>
        </Questionnaire>

        <AlertDialogFooter>
          <AlertDialogCancel className="w-20" variant={'ghost'}>
            {t('common.cancel')}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
