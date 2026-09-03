import type { ContrastResult } from "../../../shared/contrast.ts";
import { strings } from "../strings.ts";

export interface ContrastTableProps {
  rows: ContrastResult[];
}

export function ContrastTable({ rows }: ContrastTableProps): React.JSX.Element {
  const light = rows.filter((row) => row.theme === "light");
  const dark = rows.filter((row) => row.theme === "dark");

  return (
    <section className="ls-panel ls-contrast-table" aria-label={strings.contrastTable.heading}>
      <h2 className="ls-panel__heading">{strings.contrastTable.heading}</h2>
      <ContrastGroup label={strings.contrastTable.light} rows={light} />
      <ContrastGroup label={strings.contrastTable.dark} rows={dark} />
    </section>
  );
}

function ContrastGroup({ label, rows }: { label: string; rows: ContrastResult[] }): React.JSX.Element {
  return (
    <div className="ls-contrast-group">
      <h3>{label}</h3>
      <table className="ls-table">
        <thead>
          <tr>
            <th>{strings.contrastTable.pair}</th>
            <th>{strings.contrastTable.ratio}</th>
            <th>{strings.contrastTable.target}</th>
            <th>{strings.contrastTable.level}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.foreground}-${row.background}-${index}`}
              className={`ls-table__row${row.passes ? "" : " ls-table__row--fail"}`}
            >
              <td>{row.foreground} / {row.background}</td>
              <td>{row.ratio.toFixed(2)}</td>
              <td>{row.target}</td>
              <td>{row.passes ? `✓ ${row.level}` : `✕ ${strings.contrastTable.fail}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
