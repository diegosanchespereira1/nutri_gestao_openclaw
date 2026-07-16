"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ESTABLISHMENT_TYPES_BY_CATEGORY,
  establishmentTypeLabel,
} from "@/lib/constants/establishment-types";
import type { EstablishmentCategory, EstablishmentType } from "@/lib/types/establishments";

type Props = {
  id?: string;
  category: EstablishmentCategory;
  value: EstablishmentType | "";
  onChange: (value: EstablishmentType) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function EstablishmentTypeSelect({
  id = "est-type",
  category,
  value,
  onChange,
  className,
  placeholder = "Selecione",
  disabled = false,
}: Props) {
  return (
    <Select
      value={value || null}
      disabled={disabled}
      onValueChange={(next) => {
        if (next) onChange(next as EstablishmentType);
      }}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder}>
          {(selected) =>
            selected
              ? establishmentTypeLabel[selected as EstablishmentType]
              : null
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ESTABLISHMENT_TYPES_BY_CATEGORY[category].map((type) => (
          <SelectItem key={type} value={type}>
            {establishmentTypeLabel[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
