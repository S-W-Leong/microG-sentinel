import { useState } from 'react';
import { day } from '../cardio/support';
import { antibioticActive, dateOf, type GutEntry } from './model';

export function Timeline({
  history,
  selected,
  onSelect,
}: {
  history: GutEntry[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  const [page, setPage] = useState(0);
  if (!history.length) return <p>No check-ins yet.</p>;
  const first = Date.parse(dateOf(history[0].recordedAt));
  const last = Date.parse(dateOf(history.slice(-1)[0]!.recordedAt));
  const pageCount = Math.ceil(((last - first) / day + 1) / 14);
  const offset = Math.min(page, pageCount - 1);
  const end = last - offset * 14 * day;
  const start = Math.max(first, end - 13 * day);
  const dates = Array.from({ length: Math.round((end - start) / day) + 1 }, (_, index) =>
    new Date(start + index * day).toISOString().slice(0, 10),
  );
  const courses = [
    ...new Map(
      history
        .flatMap((entry) => entry.antibiotics)
        .map((course) => [`${course.name}:${course.start}`, course]),
    ).values(),
  ];
  const entriesOn = (date: string) => history.filter((entry) => dateOf(entry.recordedAt) === date);
  return (
    <>
      <div className="gut-actions">
        <button
          type="button"
          disabled={offset >= pageCount - 1}
          onClick={() => setPage(offset + 1)}
        >
          Earlier
        </button>
        <span>UTC mission dates</span>
        <button type="button" disabled={offset === 0} onClick={() => setPage(offset - 1)}>
          Later
        </button>
      </div>
      <div
        className="gut-scroll"
        tabIndex={0}
        role="region"
        aria-label="Gut timeline, scroll horizontally"
      >
        <table className="gut-timeline">
          <caption>Bristol and daily observations · blanks mean not recorded</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              {dates.map((date) => (
                <th scope="col" key={date}>
                  <button
                    type="button"
                    aria-label={`View ${date}`}
                    aria-pressed={selected === date}
                    onClick={() => onSelect(date)}
                  >
                    {date.slice(5)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[7, 6, 5, 4, 3, 2, 1].map((type) => (
              <tr key={type}>
                <th scope="row">Bristol {type}</th>
                {dates.map((date) => (
                  <td key={date}>
                    {entriesOn(date)
                      .filter((entry) => entry.bristolType === type)
                      .map((entry) => (
                        <span
                          className="gut-point"
                          key={entry.recordedAt}
                          aria-label={`Type ${type} at ${entry.recordedAt}`}
                          title={entry.recordedAt}
                        >
                          ●
                        </span>
                      ))}
                  </td>
                ))}
              </tr>
            ))}
            {(['bloating', 'abdominalPain'] as const).map((key) => (
              <tr key={key}>
                <th scope="row">{key === 'bloating' ? 'Bloating' : 'Pain'}</th>
                {dates.map((date) => (
                  <td key={date}>
                    {entriesOn(date)
                      .map((entry) => entry[key])
                      .filter((value) => value !== null)
                      .join(' / ')}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Antibiotics 14d</th>
              {dates.map((date) => {
                const latest = entriesOn(date).slice(-1)[0];
                return (
                  <td key={date}>
                    {!latest
                      ? ''
                      : latest.antibiotics14d === null
                        ? 'Unknown'
                        : latest.antibiotics14d
                          ? 'Yes'
                          : 'No'}
                  </td>
                );
              })}
            </tr>
            {courses.map((course, index) => (
              <tr key={index}>
                <th scope="row">{course.name}</th>
                {dates.map((date) => (
                  <td className={antibioticActive(course, date) ? 'gut-band' : ''} key={date}>
                    {antibioticActive(course, date) ? 'Taken' : ''}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Fibre g/24h</th>
              {dates.map((date) => (
                <td key={date}>{entriesOn(date).slice(-1)[0]?.fibre.grams ?? ''}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
