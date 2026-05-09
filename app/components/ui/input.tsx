import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${className}`}
      {...props}
    />
  );
});

export function Label({
  children,
  className = "",
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`block text-sm font-medium mb-1.5 text-[var(--foreground)] ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
