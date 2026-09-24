import type { FormEvent, ReactNode } from 'react';

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
} from '@ui/components/ui/questionnaire';

// `value` is what goes into the generated prompt; `label` is what the user sees.
const questions = [
  {
    name: 'level',
    required: true,
    title: 'Qual é o seu nível atual no tema?',
    description: 'Isso define de onde o curso começa.',
    choices: [
      { value: 'beginner', label: 'Iniciante' },
      { value: 'intermediate', label: 'Intermediário' },
      { value: 'advanced', label: 'Avançado' },
    ],
  },
  {
    name: 'depth',
    required: true,
    title: 'Qual a profundidade do curso?',
    description: 'Controla a quantidade de módulos e tópicos.',
    choices: [
      { value: 'quick', label: 'Rápido', hint: 'Visão geral enxuta.' },
      {
        value: 'standard',
        label: 'Padrão',
        hint: 'Equilíbrio entre teoria e prática.',
      },
      {
        value: 'deep',
        label: 'Profundo',
        hint: 'Cobertura completa e detalhada.',
      },
    ],
  },
  {
    name: 'goal',
    required: false,
    title: 'Qual é o seu objetivo?',
    description: 'Escolha um ou descreva o seu. Pode pular.',
    choices: [
      { value: 'get a job or career change', label: 'Carreira' },
      { value: 'build a personal project', label: 'Projeto pessoal' },
      { value: 'general knowledge and curiosity', label: 'Curiosidade' },
    ],
    input: { label: 'Outro objetivo', placeholder: 'Descreva o seu objetivo…' },
  },
  {
    name: 'focus',
    required: false,
    title: 'O que deve ter mais peso?',
    description: 'Selecione quantos quiser, ou pule.',
    multiple: true,
    choices: [
      { value: 'theory and concepts', label: 'Teoria' },
      { value: 'hands-on practice', label: 'Prática' },
      { value: 'real-world examples', label: 'Exemplos reais' },
      { value: 'exercises with feedback', label: 'Exercícios' },
    ],
  },
  {
    name: 'language',
    required: true,
    title: 'Em que idioma o curso deve ser escrito?',
    description: 'Termos técnicos podem continuar no original.',
    choices: [
      { value: 'Portuguese (pt-BR)', label: 'Português' },
      { value: 'English', label: 'English' },
    ],
  },
] as const;

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
  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(buildPrompt(topic, new FormData(event.currentTarget)));
    setOpenDialog(false);
  }

  return (
    <AlertDialog onOpenChange={setOpenDialog} open={open}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="gap-2">
        <AlertDialogHeader>
          <AlertDialogTitle>Personalizar curso</AlertDialogTitle>
          <AlertDialogDescription>
            Responda algumas perguntas para montar um prompt melhor
            {topic.trim() ? ` sobre "${topic.trim()}"` : ''}.
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
                {'input' in question ? (
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
            <QuestionnairePrevious>Voltar</QuestionnairePrevious>
            <QuestionnaireSkip>Pular</QuestionnaireSkip>
            <QuestionnaireNext>Próxima</QuestionnaireNext>
            <QuestionnaireSubmit>Criar curso</QuestionnaireSubmit>
          </QuestionnaireActions>
        </Questionnaire>

        <AlertDialogFooter>
          <AlertDialogCancel className="w-20" variant={'ghost'}>
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
