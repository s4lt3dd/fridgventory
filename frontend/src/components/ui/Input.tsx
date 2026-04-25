import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const helpText = hint ?? helperText;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-semibold text-text-primary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "block w-full rounded-[var(--radius-md)] border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-muted/50 transition-all duration-150 ease-out focus:outline-none focus-visible:outline-none",
            error
              ? "border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
              : "border-border focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm font-medium text-primary">{error}</p>
        )}
        {helpText && !error && (
          <p className="mt-1 text-sm text-text-muted">{helpText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
