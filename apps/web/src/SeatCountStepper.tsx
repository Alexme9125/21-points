import { MAX_SEATS, MIN_SEATS } from "@hotpot/engine";

export function SeatCountStepper({
  value,
  min = MIN_SEATS,
  max = MAX_SEATS,
  disabled,
  onChange,
  label = "闲家人数",
}: {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (n: number) => void;
  label?: string;
}) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button
          type="button"
          className="btn ghost stepper-btn"
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          aria-label="减少人数"
        >
          −
        </button>
        <b>{value}</b>
        <button
          type="button"
          className="btn ghost stepper-btn"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          aria-label="增加人数"
        >
          +
        </button>
      </div>
    </div>
  );
}
