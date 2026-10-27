"use client";

/** A checkbox that ticks (or clears) every `name` checkbox in its form. */
export function SelectAll({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
      <input
        type="checkbox"
        className="h-4 w-4 accent-teal-700"
        onChange={(e) => {
          for (const box of e.currentTarget.form?.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name="${name}"]`) ?? []) box.checked = e.currentTarget.checked;
        }}
      />
      {label}
    </label>
  );
}
