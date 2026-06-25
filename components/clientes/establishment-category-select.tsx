"use client";

import { useEffect } from "react";

import { useEnabledModules } from "@/components/providers/enabled-modules-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ESTABLISHMENT_CATEGORIES,
  establishmentCategoryLabel,
} from "@/lib/constants/establishment-types";
import {
  establishmentCategorySelectLabel,
  isEstablishmentCategoryEnabled,
} from "@/lib/modules/establishment-category-access";
import type { EstablishmentCategory } from "@/lib/types/establishments";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: EstablishmentCategory | "";
  onChange: (value: EstablishmentCategory | "") => void;
  required?: boolean;
  className?: string;
  describedBy?: string;
};

export function EstablishmentCategorySelect({
  id = "est-category",
  value,
  onChange,
  className,
  describedBy,
}: Props) {
  const enabledModules = useEnabledModules();

  useEffect(() => {
    if (value && !isEstablishmentCategoryEnabled(value, enabledModules)) {
      onChange("");
    }
  }, [enabledModules, onChange, value]);

  return (
    <Select
      value={value || null}
      onValueChange={(next) =>
        onChange((next ?? "") as EstablishmentCategory | "")
      }
    >
      <SelectTrigger
        id={id}
        className={className}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder="Selecione a categoria…">
          {(selected) =>
            selected
              ? establishmentCategoryLabel[selected as EstablishmentCategory]
              : null
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ESTABLISHMENT_CATEGORIES.map((category) => {
          const enabled = isEstablishmentCategoryEnabled(
            category,
            enabledModules,
          );
          return (
            <SelectItem
              key={category}
              value={category}
              disabled={!enabled}
              className={cn(!enabled && "text-muted-foreground")}
            >
              {establishmentCategorySelectLabel(category, enabledModules)}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
