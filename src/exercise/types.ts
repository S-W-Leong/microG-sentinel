export type ExerciseScope = {
  source: 'simulated-crew' | 'nasa-research-replay';
  subjectId: string;
  seriesId: string;
};
export type SourceRef = { path: string; locator: string; note: string };
export type StageContext = {
  deviceId: string | null;
  protocolId: string | null;
  posture: 'seated' | 'supine' | null;
  stageIndex: number | null;
  workloadW: number | null;
  durationSec: number | null;
  precedingStages: readonly { workloadW: number; durationSec: number }[] | null;
};
export type ExerciseSession = {
  id: string;
  scope: ExerciseScope;
  date: string | null;
  isBaseline: boolean;
  researchBasisId: string | null;
  symptoms: readonly string[];
  notes: readonly string[];
  sourceRefs: readonly SourceRef[];
};
export type StageObservation = {
  id: string;
  sessionId: string;
  context: StageContext;
  hrBpm: number | null;
  rpe: number | null;
  rpeScale: 'borg-6-20' | null;
  quality: { state: 'usable' | 'unusable' | 'unknown'; basis: string };
  duplicateOf: string | null;
  sourceRefs: readonly SourceRef[];
};
export type ExerciseDataset = {
  sessions: readonly ExerciseSession[];
  stages: readonly StageObservation[];
};
export type ComparisonPolicy = 'research-descriptive-v1' | 'crew-demo-v1';
export type StageComparison = {
  targetStageId: string;
  state: 'comparable' | 'outside-baseline-range' | 'insufficient' | 'incompatible';
  basis: 'strict' | 'qualified-research';
  baselineSessionIds: readonly string[];
  baselineValues: readonly number[];
  baselineMeanBpm: number | null;
  baselineRangeBpm: readonly [number, number] | null;
  currentBpm: number | null;
  deltaBpm: number | null;
  issues: readonly string[];
  limits: readonly string[];
};
export type EvidenceGap = {
  id: string;
  kind: 'historical-metadata' | 'record-conflict' | 'new-observation';
  recordId: string;
  requiredContext: StageContext | null;
  requiredFields: readonly ('hrBpm' | 'rpe')[];
  reason: string;
};
export type SessionComparison = {
  scope: ExerciseScope;
  targetSessionId: string;
  stages: readonly StageComparison[];
  gaps: readonly EvidenceGap[];
  symptoms: readonly string[];
  outsideRangeStageIds: readonly string[];
  independentFollowUpSessionIds: readonly string[];
};
export type ObservationOpportunity = {
  id: string;
  scope: ExerciseScope;
  plannedSessionId: string;
  scheduledAt: string;
  prescribed: boolean;
  available: boolean;
  segments: readonly { context: StageContext; provides: readonly ('hrBpm' | 'rpe')[] }[];
  additionalCrewActions: number;
  effortBasis: string;
};
export type PlanInput = {
  scope: ExerciseScope;
  nowISO: string;
  policy: ComparisonPolicy;
  gaps: readonly EvidenceGap[];
  opportunities: readonly ObservationOpportunity[];
  symptomsReported: boolean;
  reviewRequested: boolean;
};
export type ObservationPlan = {
  state: 'none-needed' | 'planned' | 'unresolved' | 'review' | 'research-only';
  selectedIds: readonly string[];
  coverage: readonly { gapId: string; opportunityId: string }[];
  unmetGapIds: readonly string[];
  rejected: readonly { opportunityId: string; reasons: readonly string[] }[];
  totalAdditionalCrewActions: number;
  completionAt: string | null;
  reasons: readonly string[];
  policyVersion: 'exercise-demo-v1';
};
