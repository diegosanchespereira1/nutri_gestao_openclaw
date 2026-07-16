"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLIENT_BUSINESS_SEGMENTS,
  clientBusinessSegmentLabel,
  isClientBusinessSegment,
} from "@/lib/constants/client-business-segment";
import type { ClientCustomSegment } from "@/lib/actions/client-segments";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__empty__";

function segmentDisplayLabel(value: string): string {
  if (!value) return "— Indefinida —";
  if (isClientBusinessSegment(value)) {
    return clientBusinessSegmentLabel[value];
  }
  return value;
}

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  customSegments?: ClientCustomSegment[];
  className?: string;
  describedBy?: string;
  disabled?: boolean;
};

export function BusinessSegmentSelect({
  id = "business-segment",
  value,
  onChange,
  customSegments = [],
  className,
  describedBy,
  disabled = false,
}: Props) {
  const selectValue = value || EMPTY_VALUE;

  return (
    <>
      <input type="hidden" name="business_segment" value={value} />
      <Select
        value={selectValue}
        disabled={disabled}
        onValueChange={(next) => {
          if (!next || next === EMPTY_VALUE) {
            onChange("");
            return;
          }
          onChange(next);
        }}
      >
        <SelectTrigger
          id={id}
          className={cn("w-full", className)}
          aria-describedby={describedBy}
        >
          <SelectValue placeholder="— Indefinida —">
            {(selected) =>
              selected && selected !== EMPTY_VALUE
                ? segmentDisplayLabel(selected)
                : null
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_VALUE}>— Indefinida —</SelectItem>
          {CLIENT_BUSINESS_SEGMENTS.map((segment) => (
            <SelectItem key={segment} value={segment}>
              {clientBusinessSegmentLabel[segment]}
            </SelectItem>
          ))}
          {customSegments.length > 0 ? (
            <>
              <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                Personalizadas
              </div>
              {customSegments.map((segment) => (
                <SelectItem key={segment.id} value={segment.label}>
                  {segment.label}
                </SelectItem>
              ))}
            </>
          ) : null}
        </SelectContent>
      </Select>
    </>
  );
}
