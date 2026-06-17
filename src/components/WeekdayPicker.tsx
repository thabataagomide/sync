import { cn } from "@/lib/utils";

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const FULL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const toggle = (i: number) => {
    const has = value.includes(i);
    onChange(has ? value.filter((x) => x !== i) : [...value, i].sort());
  };
  return (
    <div className="flex gap-1.5">
      {DAYS.map((d, i) => {
        const active = value.includes(i);
        return (
          <button
            key={i}
            type="button"
            title={FULL[i]}
            onClick={() => toggle(i)}
            className={cn(
              "h-9 w-9 rounded-lg text-xs font-semibold transition-all",
              active ? "bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary)]" : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}
