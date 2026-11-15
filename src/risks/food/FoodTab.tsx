import {
  useEffect,
  useReducer,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
} from 'react';
import type { RiskTabProps } from '../types';
import { menu, type Nutrients } from './menu';
import {
  baseEvaluation,
  baselineKey,
  demoInput,
  emptyInput,
  foodEscalation,
  massBaseline,
  mustScore,
  nutrientTotals,
  utcTimestamp,
  validateInput,
  windowMeals,
  type DailyTargets,
  type FoodInput,
} from './model';
import {
  evaluateFood,
  getFoodState,
  highSodiumWeek,
  lowEnergySummary,
  saveFood,
  subscribeFood,
} from './store';
import './food.css';

const number = (value: number | null) =>
  value === null
    ? 'Not recorded'
    : new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);
const numeric = (value: string) => (value.trim() === '' ? null : Number(value));

function Answer({
  question,
  value,
  onChange,
}: {
  question: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <fieldset className="food-answer">
      <legend>{question}</legend>
      <div>
        {[true, false, null].map((choice) => (
          <button
            key={String(choice)}
            type="button"
            aria-pressed={value === choice}
            onClick={() => onChange(choice)}
          >
            {choice === null ? 'Not recorded' : choice ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Nutrient({
  label,
  value,
  unit,
  target,
  nutrient,
  input,
}: {
  label: string;
  value: number | null;
  unit: string;
  target: number | null;
  nutrient: keyof Nutrients;
  input: FoodInput;
}) {
  const pct = value !== null && target !== null && target > 0 ? (value / target) * 100 : null;
  return (
    <details className="food-nutrient">
      <summary>
        <span
          className="food-ring"
          style={{ '--food-progress': `${Math.min(100, pct ?? 0) * 3.6}deg` } as CSSProperties}
        >
          <span>
            <strong className={value === null ? '' : 'food-value'}>{number(value)}</strong>
            {value !== null && <small className="food-value">{unit}</small>}
          </span>
        </span>
        <strong>{label}</strong>
        <span>
          {pct === null ? (
            value === null ? (
              'Intake needed'
            ) : (
              'Target needed'
            )
          ) : (
            <>
              <b className="food-value">{number(pct)}%</b> of target
            </>
          )}
        </span>
        <small>
          {target === null ? (
            'No target configured'
          ) : (
            <>
              <span className="food-value">
                {number(target)} {unit}
              </span>{' '}
              target
            </>
          )}
        </small>
      </summary>
      <ul>
        {windowMeals(input).map((meal) => {
          const item = menu.find((entry) => entry.id === meal.itemId)!;
          const contribution =
            meal.confirmed && item.per100g[nutrient] !== null
              ? (item.per100g[nutrient]! * meal.grams) / 100
              : null;
          return (
            <li key={meal.id}>
              {item.name}:{' '}
              <span className={contribution === null ? '' : 'food-value'}>
                {number(contribution)}
                {contribution === null ? ' · incomplete' : ` ${unit}`}
              </span>
            </li>
          );
        })}
      </ul>
      {!windowMeals(input).length && <p>No meals in this window.</p>}
      <p>
        {input.logComplete ? 'Reviewed 24 h log.' : 'Partial log; not a daily deficit assessment.'}
      </p>
    </details>
  );
}

export default function FoodTab(props: RiskTabProps) {
  return <FoodPanel key={props.crewId} {...props} />;
}

function FoodPanel({ crewId, vector }: RiskTabProps) {
  const context = { crewId, vector };
  const saved = useSyncExternalStore(
    (listener) => subscribeFood({ crewId, vector }, listener),
    () => getFoodState({ crewId, vector }),
    () => getFoodState({ crewId, vector }),
  );
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  useEffect(() => vector.subscribe(crewId, refresh), [crewId, vector]);
  const [draft, setDraft] = useState<FoodInput>(() =>
    saved.history.length
      ? structuredClone(saved.input)
      : // Use the vector's clock, not wall time: the demo runs on a fixed clock and rejects future records.
        emptyInput(vector.getVector(crewId)?.exposures.asOf ?? new Date().toISOString()),
  );
  const [itemId, setItemId] = useState(menu[0].id);
  const [grams, setGrams] = useState('');
  const [eatenAt, setEatenAt] = useState(draft.observedAt);
  const [ingredients, setIngredients] = useState(menu[0].ingredients);
  const [allergens, setAllergens] = useState(menu[0].allergens.join(', '));
  const [confirmed, setConfirmed] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const crew = vector.getVector(crewId);
  const draftEscalation = foodEscalation(draft, saved.history.length, crew);
  const evaluation =
    draftEscalation?.level === 'urgent'
      ? baseEvaluation(crewId, draft, saved.history.length, crew)
      : evaluateFood(context);
  const escalation = draftEscalation?.level === 'urgent' ? draftEscalation : evaluation.escalation;
  const urgent = escalation?.level === 'urgent';
  const input = saved.history.length ? saved.input : emptyInput(draft.observedAt);
  const totals = nutrientTotals(input);
  const reference = massBaseline(input, crew);
  const score = mustScore(input);
  const update = <Key extends keyof FoodInput>(key: Key, value: FoodInput[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const requestCall = () => setNotice('Call request prepared locally; no message sent.');

  function addMeal() {
    try {
      if (!confirmed || !grams.trim())
        throw new Error('Confirm the item, portion, ingredients and allergens first.');
      const next = {
        ...draft,
        meals: [
          ...draft.meals,
          {
            id: crypto.randomUUID(),
            itemId,
            grams: Number(grams),
            eatenAt: utcTimestamp(eatenAt),
            ingredients: ingredients.trim(),
            allergens: [
              ...new Set(
                allergens
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              ),
            ],
            confirmed,
          },
        ],
      };
      validateInput(next);
      setDraft(next);
      setConfirmed(false);
      setGrams('');
      setError('');
      setNotice('Meal added to draft; save the check-in to share signals.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Meal could not be added.');
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    try {
      saveFood(context, draft);
      setError('');
      setNotice('Check-in saved for this session; signals shared locally.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Check-in could not be saved.');
    }
  }

  return (
    <section className="food-tab" aria-label="Food and nutrition">
      <header className="food-heading">
        <div>
          <span className="food-kicker">Simulated · Food log</span>
          <h1>Food & nutrition</h1>
        </div>
        <span className="food-value">{crewId}</span>
      </header>
      {escalation && (
        <aside className={`food-escalation ${urgent ? 'food-urgent' : ''}`} role="alert">
          <strong>! {urgent ? 'Contact the flight surgeon now' : 'Raise at your next PMC'}</strong>
          <p>{escalation.text}</p>
          <button
            type="button"
            onClick={
              urgent ? requestCall : () => setNotice('PMC note queued locally; no message sent.')
            }
          >
            {urgent ? 'Request call' : 'Add to PMC'}
          </button>
        </aside>
      )}
      <p className="food-notice" role="status">
        {notice}
      </p>
      {error && (
        <p role="alert" className="food-error">
          {error}
        </p>
      )}
      {!urgent && (
        <>
          <div className="food-window">
            <h2>Last 24 hours</h2>
            <span>{input.logComplete ? '✓ Reviewed log' : '○ Partial log'}</span>
          </div>
          <p>
            Ending <time className="food-value">{input.observedAt || 'Not recorded'}</time>
          </p>
          <div className="food-rings">
            <Nutrient
              label="Energy"
              value={totals.energyKcal}
              unit="kcal"
              target={input.targets.energyKcal}
              nutrient="energyKcal"
              input={input}
            />
            <Nutrient
              label="Protein"
              value={totals.proteinG}
              unit="g"
              target={
                input.targets.proteinGPerKg !== null && input.bodyMassKg !== null
                  ? input.targets.proteinGPerKg * input.bodyMassKg
                  : null
              }
              nutrient="proteinG"
              input={input}
            />
            <Nutrient
              label="Sodium"
              value={totals.sodiumMg}
              unit="mg"
              target={input.targets.sodiumMg}
              nutrient="sodiumMg"
              input={input}
            />
            <Nutrient
              label="Calcium"
              value={totals.calciumMg}
              unit="mg"
              target={input.targets.calciumMg}
              nutrient="calciumMg"
              input={input}
            />
            <Nutrient
              label="Vitamin D"
              value={totals.vitaminDIu}
              unit="IU"
              target={input.targets.vitaminDIu}
              nutrient="vitaminDIu"
              input={input}
            />
          </div>
          <section className="food-mass">
            <h2>Body mass</h2>
            {highSodiumWeek(saved.history) && <p>7 days above sodium target</p>}
            {lowEnergySummary(saved.history) && <p>{lowEnergySummary(saved.history)}</p>}
            <strong className={input.bodyMassKg === null ? '' : 'food-value'}>
              {number(input.bodyMassKg)}
              {input.bodyMassKg !== null && ' kg'}
            </strong>
            <p>
              {evaluation.value === null ? (
                evaluation.label
              ) : (
                <>
                  <span className="food-value">
                    {evaluation.value > 0 ? '+' : ''}
                    {number(evaluation.value)} kg
                  </span>{' '}
                  vs baseline
                </>
              )}
            </p>
            {reference && (
              <p>
                <time className="food-value">{reference.recordedAt}</time> to{' '}
                <time className="food-value">{input.observedAt}</time>
              </p>
            )}
            <div className="food-mass-strip" aria-label="Body mass observations">
              {saved.history.map((entry) => (
                <div key={entry.observedAt}>
                  <time className="food-value">{entry.observedAt.slice(0, 10)}</time>
                  <strong className={entry.bodyMassKg === null ? '' : 'food-value'}>
                    {number(entry.bodyMassKg)}
                    {entry.bodyMassKg !== null && ' kg'}
                  </strong>
                </div>
              ))}
            </div>
            {saved.history.filter((entry) => entry.bodyMassKg !== null).length < 2 && (
              <p>Two readings needed for a trend.</p>
            )}
          </section>
          <section className="food-must">
            <h2>MUST follow-up</h2>
            <strong>
              {score === null ? 'Not recorded' : <span className="food-value">{score} / 6</span>}
            </strong>
            <p>
              {score !== null && score >= 2
                ? 'Matches the pattern for follow-up.'
                : 'Screening context, not a personal-baseline change.'}
            </p>
          </section>
        </>
      )}
      <section className="food-timeline">
        <h2>Meal timeline</h2>
        {!windowMeals(input).length && <p>No confirmed meals recorded.</p>}
        {windowMeals(input)
          .filter((meal) => meal.confirmed)
          .sort((first, second) => Date.parse(second.eatenAt) - Date.parse(first.eatenAt))
          .map((meal) => {
            const item = menu.find((entry) => entry.id === meal.itemId)!;
            return (
              <details key={meal.id}>
                <summary>
                  <time className="food-value">{meal.eatenAt}</time>
                  <strong>{item.name}</strong>
                  <span className="food-chips">
                    {meal.allergens?.length
                      ? meal.allergens.map((allergen) => <span key={allergen}>{allergen}</span>)
                      : 'No tagged allergens'}
                  </span>
                </summary>
                <p>{meal.ingredients}</p>
                <p>
                  <span className="food-value">{meal.grams} g</span> · Confirmed
                </p>
                <p>{item.source}</p>
              </details>
            );
          })}
      </section>
      <form onSubmit={save}>
        <h2>Check in</h2>
        <Answer
          question="Unable to eat or drink for 24 h?"
          value={draft.unableToEatDrink24h}
          onChange={(value) => update('unableToEatDrink24h', value)}
        />
        <Answer
          question="Unplanned weight loss over 10%?"
          value={draft.unplannedLossOver10Pct}
          onChange={(value) => update('unplannedLossOver10Pct', value)}
        />
        <div className="food-fields">
          <label>
            Observation time
            <input
              required
              value={draft.observedAt}
              onChange={(event) => update('observedAt', event.target.value)}
              placeholder="2026-11-14T11:00:00Z"
            />
          </label>
          <label>
            Body mass (kg)
            <input
              type="number"
              min="0.1"
              max="500"
              step="any"
              value={draft.bodyMassKg ?? ''}
              onChange={(event) => update('bodyMassKg', numeric(event.target.value))}
            />
          </label>
        </div>
        <details>
          <summary>Add meal</summary>
          <div className="food-fields">
            <label>
              Menu item
              <select
                value={itemId}
                onChange={(event) => {
                  const item = menu.find((entry) => entry.id === event.target.value)!;
                  setItemId(item.id);
                  setIngredients(item.ingredients);
                  setAllergens(item.allergens.join(', '));
                  setConfirmed(false);
                }}
              >
                {menu.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Portion (g)
              <input
                type="number"
                min="0.1"
                step="any"
                value={grams}
                onChange={(event) => {
                  setGrams(event.target.value);
                  setConfirmed(false);
                }}
              />
            </label>
            <label>
              Consumed time
              <input
                value={eatenAt}
                onChange={(event) => {
                  setEatenAt(event.target.value);
                  setConfirmed(false);
                }}
              />
            </label>
            <label>
              Ingredients
              <textarea
                value={ingredients}
                onChange={(event) => {
                  setIngredients(event.target.value);
                  setConfirmed(false);
                }}
              />
            </label>
            <label>
              Allergen tags
              <input
                value={allergens}
                onChange={(event) => {
                  setAllergens(event.target.value);
                  setConfirmed(false);
                }}
                placeholder="Comma-separated; empty if none"
              />
            </label>
            <label>
              Meal photo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
                    setPhoto(file);
                }}
              />
            </label>
          </div>
          <p>Photo preview only; no food identification.</p>
          {photoUrl && <img className="food-photo" src={photoUrl} alt="Local meal preview" />}
          <label className="food-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Confirm meal
          </label>
          <p>Item, portion, ingredients and allergen tags reviewed.</p>
          <button type="button" onClick={addMeal}>
            Add meal
          </button>
        </details>
        {!!draft.meals.length && (
          <details>
            <summary>Review draft</summary>
            <ul>
              {draft.meals.map((meal) => (
                <li key={meal.id}>
                  {menu.find((item) => item.id === meal.itemId)?.name} ·{' '}
                  <span className="food-value">{meal.grams} g</span>{' '}
                  <button
                    type="button"
                    aria-label={`Remove ${menu.find((item) => item.id === meal.itemId)?.name}`}
                    onClick={() =>
                      update(
                        'meals',
                        draft.meals.filter((entry) => entry.id !== meal.id),
                      )
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
        <label className="food-check">
          <input
            type="checkbox"
            checked={draft.logComplete}
            onChange={(event) => update('logComplete', event.target.checked)}
          />
          24 h complete
        </label>
        <details>
          <summary>Daily targets</summary>
          <p>Enter medical-team targets; demo targets are simulated examples.</p>
          <div className="food-fields">
            {(
              [
                ['energyKcal', 'Energy (kcal)'],
                ['proteinGPerKg', 'Protein (g/kg)'],
                ['sodiumMg', 'Sodium (mg)'],
                ['calciumMg', 'Calcium (mg)'],
                ['vitaminDIu', 'Vitamin D (IU)'],
              ] satisfies [keyof DailyTargets, string][]
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={draft.targets[key] ?? ''}
                  onChange={(event) =>
                    update('targets', { ...draft.targets, [key]: numeric(event.target.value) })
                  }
                />
              </label>
            ))}
          </div>
        </details>
        <details>
          <summary>Mass reference</summary>
          <p>Select only a same-method, same-context personal reference.</p>
          <label>
            Comparable reference
            <select
              value={draft.baselineKey ?? ''}
              onChange={(event) => update('baselineKey', event.target.value || null)}
            >
              <option value="">Not confirmed</option>
              {crew?.baselines.entries
                .filter((entry) => entry.metric === 'bodyMassKg')
                .map((entry, index) => (
                  <option key={index} value={baselineKey(entry)}>
                    {entry.value} kg · {entry.recordedAt} · {entry.methodId} · {entry.contextKey} ·{' '}
                    {entry.evidence}
                  </option>
                ))}
            </select>
          </label>
        </details>
        <details>
          <summary>MUST inputs</summary>
          <div className="food-fields">
            <label>
              Height (cm)
              <input
                type="number"
                min="0.1"
                max="300"
                step="any"
                value={draft.heightCm ?? ''}
                onChange={(event) => update('heightCm', numeric(event.target.value))}
              />
            </label>
            <label>
              Unplanned loss (%)
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={draft.unplannedLossPct ?? ''}
                onChange={(event) => update('unplannedLossPct', numeric(event.target.value))}
              />
            </label>
          </div>
          <p>Weight loss over the past 3–6 months.</p>
          <Answer
            question="Acutely ill with no intake for over 5 days, or likely?"
            value={draft.acuteIllnessNoIntake5d}
            onChange={(value) => update('acuteIllnessNoIntake5d', value)}
          />
          <p>Earth-population screening thresholds; not validated for astronauts.</p>
          <a
            href="https://www.bapen.org.uk/pdfs/must/must-full.pdf"
            target="_blank"
            rel="noreferrer"
          >
            BAPEN MUST
          </a>
        </details>
        <label className="food-check">
          <input
            type="checkbox"
            checked={draft.somethingElse}
            onChange={(event) => update('somethingElse', event.target.checked)}
          />
          Something else
        </label>
        <div className="food-actions">
          <button className="food-save" type="submit">
            Save check-in
          </button>
          <button type="button" onClick={requestCall}>
            Request call
          </button>
          {crewId === 'SIM-CDR' && saved.history.length === 0 && (
            <button
              type="button"
              onClick={() => {
                const demo = demoInput();
                setDraft(demo);
                setEatenAt(demo.observedAt);
                setNotice('Simulated demo loaded; save to share shellfish exposure.');
              }}
            >
              Load demo
            </button>
          )}
        </div>
      </form>
      <details className="food-sources">
        <summary>Sources & limits</summary>
        <p>
          Menu nutrient values are simulated, version local-menu-v1, not USDA FoodData Central data.
        </p>
        <p>Check-ins stay in this session; refreshing restores the simulated mission.</p>
        <p>
          The shared baseline supplies no observed range, so persistent outside-range detection is
          unavailable.
        </p>
        <p>Changed ingredients retain simulated menu nutrients; this is not a recipe calculator.</p>
      </details>
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}
