import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminFormSectionCardProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AdminFormSectionCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  contentClassName,
}: AdminFormSectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="border-border border-b pb-4">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" aria-hidden />
            </div>
          ) : null}
          <div className="min-w-0 space-y-1">
            <CardTitle>{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-4 pt-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
