import raw from '../../../data/curated/mr080g_exercise_stages.json?raw';
import { validateExerciseDataset } from '../validation';
const result = validateExerciseDataset(JSON.parse(raw));
if (!result.ok) throw new Error(result.errors.join('; '));
export const nasaExercise = result.data;
