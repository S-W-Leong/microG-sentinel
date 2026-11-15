import type { Rating03, RiskEvaluationContext } from '../types';
import { ContextLink, Field, NumberField, Rating, TriState } from '../cardio/TabUi';
import { flagQuestions, type MicrobiomeInput } from './model';
import { BristolPicker } from './BristolPicker';

export function GutForm({
  ctx,
  draft,
  set,
  save,
  preview,
  error,
  photoLoading,
  fibre,
}: {
  ctx: RiskEvaluationContext;
  draft: MicrobiomeInput;
  set: <Key extends keyof MicrobiomeInput>(key: Key, value: MicrobiomeInput[Key]) => void;
  save: () => void;
  preview: (file?: File) => Promise<void>;
  error: string;
  photoLoading: boolean;
  fibre: number | null;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <h2>Daily check-in</h2>
      <Field label="Observation (UTC)">
        <input
          type="datetime-local"
          required
          step="1"
          value={draft.recordedAt.replace(/Z$/, '')}
          onChange={(event) =>
            set('recordedAt', event.target.value ? `${event.target.value}Z` : '')
          }
        />
      </Field>
      <fieldset>
        <legend>Urgent symptoms</legend>
        {flagQuestions.map(([key, question]) => (
          <TriState
            key={key}
            label={question}
            value={draft.flags[key]}
            onChange={(value) => set('flags', { ...draft.flags, [key]: value })}
          />
        ))}
      </fieldset>
      <TriState
        label="Gut pattern changed"
        value={draft.changed}
        onChange={(value) => set('changed', value)}
      />
      <BristolPicker value={draft.bristolType} onChange={(value) => set('bristolType', value)} />
      <div className="gut-fields">
        {(['bloating', 'abdominalPain', 'appetite'] as const).map((key) => (
          <Rating
            key={key}
            label={
              key === 'abdominalPain'
                ? 'Abdominal pain'
                : key === 'appetite'
                  ? 'Appetite'
                  : 'Bloating'
            }
            value={draft[key]}
            anchors={
              key === 'appetite'
                ? ['0 · None', '1 · Low', '2 · Usual', '3 · High']
                : ['0 · None', '1 · Mild', '2 · Moderate', '3 · Severe']
            }
            onChange={(value) => set(key, value as Rating03 | null)}
          />
        ))}
      </div>
      <TriState
        label="Antibiotics, last 14d"
        value={draft.antibiotics14d}
        onChange={(value) => set('antibiotics14d', value)}
      />
      <p>No confirms no use throughout the last 14 days.</p>
      <details>
        <summary>Antibiotic dates</summary>
        {draft.antibiotics.map((course, index) => (
          <fieldset key={index}>
            <legend>Course {index + 1}</legend>
            <Field label="Name">
              <input
                value={course.name}
                onChange={(event) =>
                  set(
                    'antibiotics',
                    draft.antibiotics.map((item, position) =>
                      position === index ? { ...item, name: event.target.value } : item,
                    ),
                  )
                }
              />
            </Field>
            <Field label="Start date">
              <input
                type="date"
                value={course.start}
                onChange={(event) =>
                  set(
                    'antibiotics',
                    draft.antibiotics.map((item, position) =>
                      position === index ? { ...item, start: event.target.value } : item,
                    ),
                  )
                }
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                disabled={course.ongoing}
                value={course.end ?? ''}
                onChange={(event) =>
                  set(
                    'antibiotics',
                    draft.antibiotics.map((item, position) =>
                      position === index ? { ...item, end: event.target.value || null } : item,
                    ),
                  )
                }
              />
            </Field>
            <label className="gut-check">
              <input
                type="checkbox"
                checked={course.ongoing}
                onChange={(event) =>
                  set(
                    'antibiotics',
                    draft.antibiotics.map((item, position) =>
                      position === index
                        ? { ...item, ongoing: event.target.checked, end: null }
                        : item,
                    ),
                  )
                }
              />
              Ongoing
            </label>
            <button
              type="button"
              onClick={() =>
                set(
                  'antibiotics',
                  draft.antibiotics.filter((_, position) => position !== index),
                )
              }
            >
              Remove course
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          onClick={() =>
            set('antibiotics', [
              ...draft.antibiotics,
              { name: '', start: '', end: null, ongoing: true },
            ])
          }
        >
          Add course
        </button>
      </details>
      <details>
        <summary>Skin observation</summary>
        <Field label="Local skin photo">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void preview(event.target.files?.[0])}
          />
        </Field>
        <p>Optional · stays in this session · 5 MB maximum.</p>
        {draft.photo && (
          <img className="gut-photo" src={draft.photo.url} alt="Local skin observation preview" />
        )}
        {(['redness', 'warmth', 'discharge'] as const).map((key) => (
          <TriState
            key={key}
            label={key[0].toUpperCase() + key.slice(1)}
            value={draft.skin[key]}
            onChange={(value) => set('skin', { ...draft.skin, [key]: value })}
          />
        ))}
        <p>Confirm observations yourself; photos are not analysed.</p>
      </details>
      <details>
        <summary>Fibre context</summary>
        <p>
          <strong>
            {fibre ?? 'Not recorded'}
            {fibre !== null && ' g'}
          </strong>{' '}
          · Food / 24h
        </p>
        <ContextLink ctx={ctx} risk="food">
          Open Food
        </ContextLink>
        <Field label="Mission start">
          <input
            type="date"
            value={draft.missionStart}
            onChange={(event) => set('missionStart', event.target.value)}
          />
        </Field>
        <NumberField
          label="Fibre target (g)"
          value={draft.fibreTargetG}
          min={0}
          max={200}
          onChange={(value) => set('fibreTargetG', value)}
        />
        <Field label="Target source">
          <input
            value={draft.targetNote}
            placeholder="Personal target documentation"
            onChange={(event) => set('targetNote', event.target.value)}
          />
        </Field>
        <p>A target is context, not a clinical threshold.</p>
      </details>
      {error && <p role="alert">{error}</p>}
      <button className="risk-primary" type="submit" disabled={photoLoading}>
        {photoLoading ? 'Reading photo' : 'Save check-in'}
      </button>
    </form>
  );
}
