// Shared MicroG Sentinel risk/vector contract (generated from docs/battleplan.md, contract section).
// Owner: Siang Woo. Change only by agreement of both owners; keep docs/battleplan.md in sync.
import type { ComponentType } from 'react';
import type { DataSource, EvidenceStatus } from '../types';

export type RiskId =
  'cardio' | 'sleep' | 'immune' | 'bone' | 'balance' | 'microbiome' | 'sans' | 'food' | 'mood';
export type CrewId = string;
export type ISODateTime = string;
export type Rating03 = 0 | 1 | 2 | 3;
export type AllergenName = string;

export interface CrewTraits {
  allergies: string[] | null;
  motionSicknessHistory: Rating03 | null;
  chronotype: 'morning' | 'intermediate' | 'evening' | null;
  geneticFlags: string[] | null;
}

export interface BaselineUnits {
  hrAtWorkloadBpm: 'bpm';
  restingHrBpm: 'bpm';
  vo2PeakLPerMin: 'L/min';
  vo2PeakMlPerKgPerMin: 'mL/kg/min';
  sleepHours: 'h';
  bmdGPerCm2: 'g/cm²';
  swayAreaEyesOpenDeg2: 'deg²';
  swayAreaEyesClosedDeg2: 'deg²';
  nearVisionLines: 'lines';
  octThicknessUm: 'µm';
  bodyMassKg: 'kg';
  mood: 'score/10';
}
export type BaselineMetric = keyof BaselineUnits;
export type BoneSite = 'lumbar-spine' | 'total-hip' | 'femoral-neck';
export interface BaselineValue<M extends BaselineMetric> {
  metric: M;
  value: number | null;
  unit: BaselineUnits[M];
  sourceSessionIds: string[];
  count: number;
  source: DataSource;
  comparisonGroupId: string;
  methodId: string;
  contextKey: string;
  recordedAt: ISODateTime | null;
  evidence: EvidenceStatus;
}
export type BaselineEntry = {
  [M in BaselineMetric]: BaselineValue<M>;
}[BaselineMetric];
export interface CrewBaselines {
  entries: BaselineEntry[];
}

export interface FoodExposure {
  mealId: string;
  foodName: string;
  eatenAt: ISODateTime;
}
export interface AllergenExposure {
  mealId: string;
  allergen: AllergenName;
  eatenAt: ISODateTime;
}
export interface SignalRef {
  risk: RiskId;
  signal: string;
  recordedAt: ISODateTime;
  source: DataSource;
  simulated: boolean;
}
export interface ExposureScalars {
  sleepDebtHours: number | null;
  exerciseLoadPct: number | null;
  resistanceLoadPct: number | null;
  daysInFlight: number | null;
  cabinCo2MmHg: number | null;
  sodiumMg: number | null;
  calciumMg: number | null;
  vitaminDIu: number | null;
  fibreG: number | null;
  energyPctOfNeed: number | null;
  bodyMassKg: number | null;
}
export interface CrewExposures extends ExposureScalars {
  asOf: ISODateTime;
  sinceHours: number;
  recentFoods: FoodExposure[] | null;
  allergensEaten: AllergenExposure[] | null;
  refs: { [K in keyof ExposureScalars]: SignalRef | null };
  foodRecordRefs: SignalRef[];
}
export interface CrewVector {
  crewId: CrewId;
  source: DataSource;
  simulated: boolean;
  traits: CrewTraits;
  baselines: CrewBaselines;
  exposures: CrewExposures;
}
export interface CardioSignals {
  workloadW: number | null;
  hrDeltaBpmAtWorkload: number | null;
  vo2PeakPctBaseline: number | null;
  exerciseLoadPct: number | null;
  restingHrBpm: number | null;
  borgRpe: number | null;
  missingReadingsCount: number | null;
}
export interface SleepSignals {
  sleepHours: number | null;
  sleepEfficiencyPct: number | null;
  sleepDebtHours: number | null;
  sleepinessKarolinska: number | null;
  fatigueSamnPerelli: number | null;
  bodyClockShiftHours: number | null;
}
export interface ImmuneSignals {
  hivesPatternPct: number | null;
  rashActive: boolean | null;
  whealCountBand: Rating03 | null;
  itch: Rating03 | null;
  raised: boolean | null;
  clearEdges: boolean | null;
  paleCentre: boolean | null;
  fadesWithin24h: boolean | null;
  bodyAreasCount: number | null;
}
export interface BoneSignals {
  site: BoneSite | null;
  bmdChangePctPerMonth: number | null;
  resistanceLoadPct: number | null;
  daysInFlight: number | null;
}
export interface BalanceSignals {
  swayAreaEyesOpenDeg2: number | null;
  swayAreaEyesClosedDeg2: number | null;
  swayRatioEyesClosed: number | null;
  dizziness: number | null;
  motionSickness: number | null;
  headMovementTolerance: Rating03 | null;
}
export interface MicrobiomeSignals {
  bristolType: number | null;
  bloating: Rating03 | null;
  abdominalPain: Rating03 | null;
  appetite: Rating03 | null;
  antibiotics14d: boolean | null;
  skinInfectionSigns: Rating03 | null;
  gutChangeDays: number | null;
}
export interface SansSignals {
  eye: 'left-eye' | 'right-eye' | null;
  amslerDistortion: Rating03 | null;
  nearVisionChangeLines: number | null;
  headache: number | null;
  octThicknessChangeUm: number | null;
  cabinCo2MmHg: number | null;
}
export interface FoodSignals {
  foodsEaten: FoodExposure[] | null;
  allergensEaten: AllergenExposure[] | null;
  energyPctOfNeed: number | null;
  proteinGPerKg: number | null;
  sodiumMg: number | null;
  calciumMg: number | null;
  vitaminDIu: number | null;
  fibreG: number | null;
  bodyMassKg: number | null;
  bodyMassChangeKg: number | null;
}
export interface MoodSignals {
  mood: number | null;
  stress: number | null;
  workload: number | null;
  isolation: number | null;
  crewConflict: boolean | null;
}
export interface RiskSignalsMap {
  cardio: CardioSignals;
  sleep: SleepSignals;
  immune: ImmuneSignals;
  bone: BoneSignals;
  balance: BalanceSignals;
  microbiome: MicrobiomeSignals;
  sans: SansSignals;
  food: FoodSignals;
  mood: MoodSignals;
}
export interface RiskSignalRecord<R extends RiskId = RiskId> {
  risk: R;
  crewId: CrewId;
  recordedAt: ISODateTime;
  simulated: boolean;
  source: DataSource;
  signals: RiskSignalsMap[R];
}
export type AnyRiskSignalRecord = {
  [R in RiskId]: RiskSignalRecord<R>;
}[RiskId];
export type SignalPath = {
  [R in RiskId]: `${R}.${Extract<keyof RiskSignalsMap[R], string>}`;
}[RiskId];
export type TraitPath = `traits.${keyof CrewTraits}`;
export interface Reason {
  direction: 'up' | 'down';
  text: string; // 1–8 whitespace-separated words after trim
  sourceRisk: RiskId;
  signal: SignalPath | TraitPath;
}
export interface PersonalisationResult {
  adjustedPct: number | null;
  reasons: Reason[];
}
export interface VectorApi {
  emitSignals(record: AnyRiskSignalRecord): void;
  getVector(crewId: CrewId): CrewVector | null;
  getExposures(crewId: CrewId, sinceHours: number): CrewExposures | null;
  getSignals<R extends RiskId>(
    risk: R,
    crewId: CrewId,
    sinceHours: number,
  ): RiskSignalRecord<R> | null;
  personalise(risk: RiskId, crewId: CrewId, baseEvaluation: RiskEvaluation): PersonalisationResult;
  subscribe(crewId: CrewId, listener: () => void): () => void;
}
export type EvaluationUnit =
  '%' | 'bpm' | 'h' | '%/month' | 'ratio' | 'lines' | 'µm' | 'kg' | 'score/10';
export interface RiskEvaluation {
  risk: RiskId;
  crewId: CrewId;
  kind: 'pattern-match' | 'change-vs-baseline';
  value: number | null;
  unit: EvaluationUnit;
  label: string;
  reasons: Reason[];
  evidence: EvidenceStatus;
  simulated: boolean;
  escalation: Escalation | null;
}
export interface Escalation {
  level: 'urgent' | 'next-pmc';
  trigger:
    | 'red-flag'
    | 'no-pattern'
    | 'conflicting'
    | 'persistent-change'
    | 'something-else'
    | 'indicative-score';
  text: string; // observed fact, 1–12 words, no suspected condition
}
export interface RiskRegionMap {
  cardio: 'heart-lungs';
  sleep: 'head';
  immune: 'skin';
  bone: 'bones';
  balance: 'head';
  microbiome: 'gut';
  sans: 'eyes';
  food: 'gut';
  mood: 'head';
}
export interface RiskTabProps {
  crewId: CrewId;
  vector: VectorApi;
}
export interface RiskEvaluationContext {
  crewId: CrewId;
  vector: VectorApi;
}
export interface RiskTab<R extends RiskId = RiskId> {
  id: R;
  region: RiskRegionMap[R];
  title: string;
  Component: ComponentType<RiskTabProps>;
  evaluate(context: RiskEvaluationContext): RiskEvaluation;
  loadScenario?(context: RiskEvaluationContext): void;
}
