import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldProps = ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string;
};

/** Labelled input with an accessible error message. */
export function FormField({ id, label, error, className, ...inputProps }: FormFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className={className ? `flex flex-col gap-2 ${className}` : "flex flex-col gap-2"}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
