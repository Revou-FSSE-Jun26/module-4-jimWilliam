import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  label: string;
  error?: string | null;
  trailing?: ReactNode;
}

/**
 * Floating-label input (R37.2). The label is a real <label>; errors are linked with
 * aria-describedby and aria-invalid (FE-09). `placeholder=" "` drives the floating state.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, trailing, id, className = "", ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={`enter ${className}`}>
      <div className="field">
        <input
          ref={ref}
          id={inputId}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`field-input ${trailing ? "pe-12" : ""}`}
          {...rest}
        />
        <label htmlFor={inputId} className="field-label">{label}</label>
        {trailing && <div className="absolute inset-y-0 end-1 flex items-center">{trailing}</div>}
      </div>
      {error && <p id={errorId} className="field-error">{error}</p>}
    </div>
  );
});
