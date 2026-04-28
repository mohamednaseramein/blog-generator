import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AuthorProfile, BlogIntent } from '../api/profile-api.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Field } from './ui/field.js';

const INTENT_OPTIONS: { value: BlogIntent; label: string }[] = [
  { value: 'thought_leadership', label: 'Thought Leadership' },
  { value: 'seo', label: 'SEO' },
  { value: 'product_announcement', label: 'Product Announcement' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'deep_dive', label: 'Deep Dive' },
];

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'At most 120 characters'),
  authorRole: z.string().min(1, 'Author role is required').max(200, 'At most 200 characters'),
  audiencePersona: z.string().min(1, 'Audience persona is required').max(5000, 'At most 5000 characters'),
  intent: z.enum(['thought_leadership', 'seo', 'product_announcement', 'newsletter', 'deep_dive']),
  toneOfVoice: z.string().min(1, 'Tone of voice is required').max(200, 'At most 200 characters'),
  voiceNote: z.string().max(500, 'At most 500 characters').optional().default(''),
});

type FormValues = z.input<typeof schema>;

interface Props {
  initialValues?: Partial<AuthorProfile>;
  onSubmit: (values: FormValues) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function ProfileForm({ initialValues, onSubmit, submitLabel = 'Create Profile', isLoading = false }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? '',
      authorRole: initialValues?.authorRole ?? '',
      audiencePersona: initialValues?.audiencePersona ?? '',
      intent: initialValues?.intent ?? 'thought_leadership',
      toneOfVoice: initialValues?.toneOfVoice ?? '',
      voiceNote: initialValues?.voiceNote ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Profile Name" error={errors.name?.message}>
        <Input {...register('name')} placeholder="e.g., My CTO Voice" />
      </Field>

      <Field label="Author Role" error={errors.authorRole?.message}>
        <Input {...register('authorRole')} placeholder="e.g., CTO / Engineering Leader" />
      </Field>

      <Field label="Audience Persona" error={errors.audiencePersona?.message}>
        <Textarea {...register('audiencePersona')} placeholder="Who are you writing for?" rows={3} />
      </Field>

      <Field label="Intent" error={errors.intent?.message}>
        <select {...register('intent')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {INTENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Tone of Voice" error={errors.toneOfVoice?.message}>
        <Input {...register('toneOfVoice')} placeholder="e.g., Direct, evidence-based, confident" />
      </Field>

      <Field label="Style Guidance (Optional)" error={errors.voiceNote?.message}>
        <Textarea {...register('voiceNote')} placeholder="Any additional style notes (e.g., avoid hype words)" rows={3} />
      </Field>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Creating...' : submitLabel}
      </Button>
    </form>
  );
}
