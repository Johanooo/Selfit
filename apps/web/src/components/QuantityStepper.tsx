import { Minus, Plus } from 'lucide-react';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
  id,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  id: string;
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Minska antal"
        data-testid={`button-decrease-${id}`}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <output aria-live="polite" aria-label={`Antal: ${value}`} data-testid={`text-qty-${id}`}>
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Öka antal"
        data-testid={`button-increase-${id}`}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
