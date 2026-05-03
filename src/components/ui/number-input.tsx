"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * A controlled-but-buffered numeric input.
 *
 * Holds the user's keystrokes in local state so partial edits like "" or "1."
 * don't immediately snap back to a number. This means the user *can* delete
 * the last `0` from a field — the displayed value is the buffer, not the
 * parent's number. The parent value is updated on each valid edit; the buffer
 * is only re-formatted on blur.
 *
 * Behaviour summary:
 *  - Typing in the field commits a parsed number to the parent (when valid)
 *    but leaves the displayed text alone — so "12" → backspace twice → ""
 *    stays as "" until you blur or type something new.
 *  - Pressing Enter blurs the field. When `onEnter` is provided it is called
 *    after the blur fires, so callers can move focus to the next input.
 *  - On focus, if the current value is `0`, the buffer is cleared so the
 *    user can just start typing the new value.
 *  - On blur, an empty/invalid buffer is reset to the parent's current value;
 *    a valid value is committed and re-formatted.
 *  - When the parent value changes for non-typing reasons (slider, redistribute,
 *    solver run, …) the buffer follows along — but never while focused.
 */
export interface NumberInputProps {
  value: number;
  onCommit: (v: number) => void;
  onEnter?: () => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  title?: string;
  id?: string;
  /** When true (default), focusing while value === 0 clears the field. */
  clearZeroOnFocus?: boolean;
}

export function NumberInput({
  value,
  onCommit,
  onEnter,
  step,
  min,
  max,
  className,
  disabled,
  placeholder,
  ariaLabel,
  title,
  id,
  clearZeroOnFocus = true,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string>(() => String(value));
  const focusedRef = useRef(false);
  const lastExternal = useRef<number>(value);

  useEffect(() => {
    if (focusedRef.current) return;
    if (value !== lastExternal.current) {
      lastExternal.current = value;
      setDraft(String(value));
    }
  }, [value]);

  function tryCommit(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") return;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;
    lastExternal.current = parsed;
    onCommit(parsed);
  }

  return (
    <Input
      type="number"
      step={step}
      min={min}
      max={max}
      className={className}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      title={title}
      id={id}
      value={draft}
      onFocus={(e) => {
        focusedRef.current = true;
        if (clearZeroOnFocus && Number(draft) === 0) {
          setDraft("");
          // Select after clearing so the cursor sits in an empty field.
          requestAnimationFrame(() => {
            try {
              e.target.select();
            } catch {
              /* ignore */
            }
          });
        }
      }}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        // Commit valid numbers as-you-type so the parent stays in sync, but
        // don't reformat the buffer — that would clobber partial edits.
        tryCommit(next);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        const trimmed = e.target.value.trim();
        if (trimmed === "" || !Number.isFinite(Number(trimmed))) {
          // Restore the parent's value when the user leaves the field empty
          // or with invalid text.
          setDraft(String(value));
          return;
        }
        const parsed = Number(trimmed);
        lastExternal.current = parsed;
        onCommit(parsed);
        setDraft(String(parsed));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
          onEnter?.();
        }
      }}
    />
  );
}
