import type { ReportDraft } from '../ui/personalValues';

export default function ValuesReportFields({
  role,
  report,
  onChange,
}: {
  role: 'baseline' | 'later';
  report: ReportDraft;
  onChange: (field: keyof ReportDraft, value: string) => void;
}) {
  const testFields = (
    <div className="values-fields">
      <label>
        Metric
        <select
          aria-label="Metric"
          aria-describedby={`${role}-metric-help`}
          value={report.metric}
          onChange={(e) => onChange('metric', e.target.value)}
          required
        >
          <option value="" disabled>
            Choose from your report
          </option>
          <option>VO2peak</option>
          <option>VO2max</option>
          <option value="unknown">Not listed</option>
        </select>
        <small id={`${role}-metric-help`}>
          Copy the exact measure. VO2peak and VO2max stay separate.
        </small>
      </label>
      <label>
        Units
        <select
          aria-label="Units"
          aria-describedby={`${role}-unit-help`}
          value={report.unit}
          onChange={(e) => onChange('unit', e.target.value)}
          required
        >
          <option value="" disabled>
            Choose from your report
          </option>
          <option>L/min</option>
          <option>mL/kg/min</option>
          <option value="unknown">Not listed</option>
        </select>
        <small id={`${role}-unit-help`}>
          L/min is total oxygen uptake; mL/kg/min accounts for body mass.
        </small>
      </label>
      <label className="full-field">
        Documented method
        <input
          aria-label="Documented method"
          aria-describedby={`${role}-method-help`}
          value={report.method}
          onChange={(e) => onChange('method', e.target.value)}
        />
        <small id={`${role}-method-help`}>
          Copy the test method from the report. Leave blank if it is not listed; a comparison may
          then be withheld.
        </small>
      </label>
    </div>
  );
  return (
    <>
      <div className="values-fields">
        <label>
          {role === 'baseline' ? 'Baseline date' : 'Later result date'}
          <input
            type="date"
            value={report.date}
            onInput={(e) => onChange('date', e.currentTarget.value)}
            onChange={(e) => onChange('date', e.target.value)}
            required
          />
        </label>
        <label>
          {role === 'baseline' ? 'Baseline capacity' : 'Later capacity'}
          <input
            type="number"
            aria-label={role === 'baseline' ? 'Baseline capacity' : 'Later capacity'}
            aria-describedby={`${role}-capacity-help`}
            min="0"
            step="any"
            value={report.value}
            onChange={(e) => onChange('value', e.target.value)}
            required
          />
          <small id={`${role}-capacity-help`}>Enter the capacity value exactly as reported.</small>
        </label>
      </div>
      {role === 'baseline' ? (
        testFields
      ) : (
        <details className="copied-test-details" open>
          <summary>Check or change the copied test details</summary>
          <p>
            These details were copied from your baseline. Check your later report and change
            anything that differs. Different metrics, units or methods may prevent a comparison.
          </p>
          {testFields}
        </details>
      )}
      <details className="values-optional">
        <summary>Other report details (optional)</summary>
        <div className="values-fields">
          <label>
            Test modality
            <input value={report.modality} onChange={(e) => onChange('modality', e.target.value)} />
            <small>The activity or equipment, as printed on the report.</small>
          </label>
          <label>
            Protocol
            <input value={report.protocol} onChange={(e) => onChange('protocol', e.target.value)} />
          </label>
          <label>
            Body mass (kg)
            <input
              type="number"
              min="0"
              step="any"
              value={report.bodyMassKg}
              onChange={(e) => onChange('bodyMassKg', e.target.value)}
            />
          </label>
          <label>
            Phase
            <select value={report.phase} onChange={(e) => onChange('phase', e.target.value)}>
              <option value="not-applicable">Not part of a mission or study</option>
              <option value="">Unknown</option>
              {[
                'pre-mission',
                'in-mission',
                'post-mission',
                'pre-bed-rest',
                'bed-rest',
                'post-bed-rest',
                'recovery',
              ].map((phase) => (
                <option key={phase}>{phase}</option>
              ))}
            </select>
          </label>
          <label className="full-field">
            Source notes
            <textarea
              rows={2}
              value={report.notes}
              onChange={(e) => onChange('notes', e.target.value)}
            />
          </label>
        </div>
      </details>
    </>
  );
}
