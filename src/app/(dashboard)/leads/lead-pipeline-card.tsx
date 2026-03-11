"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadPipelineCardProps {
  lead: {
    id: string;
    title: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    source: string | null;
    stage: string;
  };
  stage: string;
  stageColor?: string | null;
  onEdit: () => void;
  isDragging?: boolean;
}

export function LeadPipelineCard({
  lead,
  stageColor,
  onEdit,
  isDragging,
}: LeadPipelineCardProps) {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");

  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-all border-l-2",
        isDragging && "opacity-50 scale-95"
      )}
      style={stageColor ? { borderLeftColor: stageColor } : undefined}
      onClick={onEdit}
    >
      <CardContent className="p-3">
        <div className="space-y-1.5">
          <p className="font-medium text-sm leading-tight">
            {fullName || "—"}
          </p>

          {lead.phone && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </p>
          )}

          {lead.email && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="size-3 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </p>
          )}

          {lead.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {lead.notes}
            </p>
          )}

          {lead.source && (
            <Badge variant="outline" className="text-[10px] mt-1">
              {lead.source}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
