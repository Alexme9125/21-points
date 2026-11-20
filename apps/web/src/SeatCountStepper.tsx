import { decksForSeats, MAX_SEATS, MIN_SEATS } from "@hotpot/engine";

export function SeatCountStepper({
  value,
  min = MIN_SEATS,
  max = MAX_SEATS,
  disabled,
  onChange,
  label = "座位数",
}: {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (n: number) => void;
  label?: string;
}) {
  const decks = decksForSeats(value);
  const options = Array.from({ length: MAX_SEATS - MIN_SEATS + 1 }, (_, i) => MIN_SEATS + i);

  return (
    <div className="seat-picker">
      <div className="seat-picker-head">
        <span className="field-label">{label}</span>
        <span className="seat-picker-meta">{decks} 副牌靴</span>
      </div>
      <div className="seat-segments" role="radiogroup" aria-label={label}>
        {options.map((n) => {
          const active = n === value;
          const blocked = Boolean(disabled || n < min || n > max);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              className={`seat-seg ${active ? "selected" : ""}`}
              disabled={blocked}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
