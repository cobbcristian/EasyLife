"use client";

export function LocationFilter({
  locations,
  value,
  onChange,
  label,
}: {
  locations: string[];
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  const options = ["All locations", ...locations];
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-2xl border border-[#e4e8ee] bg-white px-3 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
