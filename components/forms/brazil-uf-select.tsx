"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRAZIL_STATES } from "@/lib/constants/brazil-states";

type Props = {
  id?: string;
  value: string;
  onChange: (uf: string) => void;
  className?: string;
  placeholder?: string;
};

export function BrazilUfSelect({
  id = "uf",
  value,
  onChange,
  className,
  placeholder = "Selecione o estado",
}: Props) {
  return (
    <Select
      value={value || null}
      onValueChange={(next) => onChange(next ?? "")}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder}>
          {(selected) => {
            if (!selected) return null;
            const state = BRAZIL_STATES.find((item) => item.uf === selected);
            return state ? `${state.uf} — ${state.name}` : selected;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {BRAZIL_STATES.map((state) => (
          <SelectItem key={state.uf} value={state.uf}>
            {state.uf} — {state.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
