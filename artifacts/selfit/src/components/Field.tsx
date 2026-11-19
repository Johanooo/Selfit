import { useState, type InputHTMLAttributes, type FormEvent } from 'react';

export interface ValidityMessages {
  valueMissing?: string;
  typeMismatch?: string;
  patternMismatch?: string;
  tooShort?: string;
}

/** Picks a Swedish message for the browser's native validity state. */
export function swedishMessage(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, m: ValidityMessages) {
  const v = el.validity;
  if (v.valueMissing) return m.valueMissing ?? 'Fältet måste fyllas i.';
  if (v.typeMismatch) return m.typeMismatch ?? 'Kontrollera formatet.';
  if (v.patternMismatch) return m.patternMismatch ?? 'Kontrollera formatet.';
  if (v.tooShort) return m.tooShort ?? 'Svaret är för kort.';
  return '';
}

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  messages?: ValidityMessages;
  wrapperClass?: string;
}

export function TextField({ id, label, hint, messages = {}, wrapperClass, ...input }: Props) {
  const [error, setError] = useState('');
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${wrapperClass ?? ''}`}>
      <label htmlFor={id}>
        {label}
        {input.required ? '' : <span className="muted"> (valfritt)</span>}
      </label>
      <input
        id={id}
        name={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        data-testid={`input-${id}`}
        onInvalid={(e: FormEvent<HTMLInputElement>) => {
          const msg = swedishMessage(e.currentTarget, messages);
          e.currentTarget.setCustomValidity(msg);
          setError(msg);
        }}
        onInput={(e: FormEvent<HTMLInputElement>) => {
          e.currentTarget.setCustomValidity('');
          if (error) setError(e.currentTarget.checkValidity() ? '' : swedishMessage(e.currentTarget, messages));
        }}
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
