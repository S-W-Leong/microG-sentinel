// Shared contract between assessment logic (Developer A) and the interface (Developer B).
// Change it only by agreement: both sides build against these shapes.

export type Metric = 'VO2peak' | 'VO2max';
export type Unit = 'L/min' | 'mL/kg/min';
export type DataSource = 'simulated-crew' | 'nasa-research-replay';
export type Phase =
  | 'pre-mission'
  | 'in-mission'
  | 'post-mission'
  | 'pre-bed-rest'
  | 'bed-rest'
  | 'post-bed-rest'
  | 'recovery';

/** One assessment exactly as recorded. Missing values stay null, never 0. */
export interface Assessment {
  id: string;
  subjectId: string;
  source: DataSource;
  date: string | null; // ISO yyyy-mm-dd
  phase: Phase | null;
  metric: Metric | null;
  value: number | null;
  unit: Unit | null;
  bodyMassKg: number | null;
  method: string | null; // documented comparison basis, e.g. "graded cycle ergometer test"
  modality: string | null; // e.g. "cycle ergometer"
  protocol: string | null;
  isBaseline: boolean;
  duplicateOf?: string; // id of the assessment this one re-represents
  sourceNotes: string[];
}

export type EvidenceStatus = 'supported' | 'insufficient' | 'conflicting';

export type IssueCode =
  | 'identity'
  | 'timing'
  | 'missing'
  | 'duplicate'
  | 'metric'
  | 'method'
  | 'units'
  | 'baseline';

export interface Issue {
  code: IssueCode;
  message: string; // plain-language explanation shown to the astronaut
  followUp: string; // the specific next step from the brief's follow-up table
}

export interface BaselineChoice {
  rule: string; // e.g. "Arithmetic mean of 2 pre-bed-rest assessments"
  recordIds: string[];
  value: number;
  unit: Unit;
}

export interface Calculation {
  current: number;
  unit: Unit;
  baseline: BaselineChoice;
  retainedPct: number; // current / baseline * 100
  changePct: number; // (current - baseline) / baseline * 100
}

/** 'not-applicable' for research replay: it never receives a reference determination. */
export type ReferenceState = 'at-or-above' | 'below' | 'not-applicable';

export interface ReferenceComparison {
  label: string; // "NASA-STD-3001 V1 4003: in-mission aerobic capacity at or above 80% of pre-mission"
  thresholdPct: 80;
  state: ReferenceState;
  note: string;
}

/** Everything one assessment card renders. */
export interface AssessmentResult {
  assessmentId: string;
  source: DataSource;
  finding: string;
  calculation: Calculation | null; // null when evidence blocks the comparison
  evidence: EvidenceStatus;
  issues: Issue[];
  reference: ReferenceComparison;
  limits: string[];
  followUp: string[];
}

export interface TrendPoint {
  assessmentId: string;
  date: string;
  retainedPct: number | null;
  evidence: EvidenceStatus; // non-supported points render hollow and are not joined
  isBaseline: boolean;
}
