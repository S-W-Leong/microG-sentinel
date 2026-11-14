import type { RiskEvaluationContext } from '../types';
import { atDay, scenarioStory } from '../../scenario/mission';
import { baselineKey, demoInput, type FoodInput, type Meal } from './model';
import { menu } from './menu';
import { getFoodState, saveFood } from './store';

export function foodScenario(ctx: RiskEvaluationContext): FoodInput[] {
  const story = scenarioStory(ctx);
  if (!story) return [];
  const baseline = ctx.vector
    .getVector(ctx.crewId)
    ?.baselines.entries.find((entry) => entry.metric === 'bodyMassKg');
  return Array.from({ length: story.food.days }, (_, index) => {
    const daysAgo = story.food.days - index - 1;
    const commander = ctx.crewId === 'SIM-CDR';
    const pilot = ctx.crewId === 'SIM-PLT';
    const portions: [string, number, number, number][] = commander
      ? [
          ['sim-savoury-chicken', 400, daysAgo + 1, 13],
          ['sim-savoury-chicken', 600, daysAgo + 1, 19],
          [daysAgo === 0 ? 'sim-shrimp-rice' : 'sim-chicken-rice', 250, daysAgo, 8],
          ['sim-oats', 250, daysAgo, 7],
        ]
      : [
          ['sim-chicken-rice', pilot ? 500 : 400, daysAgo + 1, 13],
          ['sim-lentils', pilot ? 500 : 300, daysAgo + 1, 19],
          ['sim-chicken-rice', pilot ? 500 : 400, daysAgo, 8],
        ];
    const meals: Meal[] = portions.map(([itemId, grams, day, hour], mealIndex) => {
      const item = menu.find((entry) => entry.id === itemId)!;
      return {
        id: `${ctx.crewId}-MD${100 - daysAgo}-${mealIndex}`,
        itemId,
        grams,
        eatenAt: atDay(day, hour),
        ingredients: item.ingredients,
        allergens: [...item.allergens],
        confirmed: true,
      };
    });
    return {
      ...demoInput(),
      observedAt: atDay(daysAgo, 10),
      meals,
      logComplete: true,
      bodyMassKg:
        story.food.baselineKg +
        ((story.food.currentKg - story.food.baselineKg) * (index + 1)) / story.food.days,
      baselineKey: baseline?.metric === 'bodyMassKg' ? baselineKey(baseline) : null,
      targets: {
        energyKcal: story.food.energyTargetKcal,
        proteinGPerKg: 1.2,
        sodiumMg: 2300,
        calciumMg: 1000,
        vitaminDIu: 600,
      },
      heightCm: pilot ? 182 : 175,
      unplannedLossPct:
        (100 * (story.food.baselineKg - story.food.currentKg)) / story.food.baselineKg,
      acuteIllnessNoIntake5d: false,
    };
  });
}

export function loadScenario(ctx: RiskEvaluationContext) {
  // Resume after a partial load, but never overwrite existing or later user observations.
  for (const input of foodScenario(ctx)) {
    if (getFoodState(ctx).history.some((entry) => entry.observedAt >= input.observedAt)) continue;
    saveFood(ctx, input);
  }
}
