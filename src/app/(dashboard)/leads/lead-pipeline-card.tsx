"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DollarSign, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  "prospecting",
  "qualification",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecting",
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

interface LeadPipelineCardProps {
  lead: {
    id: string;
    title: string;
    customer: { name: string } | null;
    source: string | null;
    value: number | null;
    stage: string;
    assignedTo: {
      fullName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  stage: string;
  onEdit: () => void;
  onMoveStage: (leadId: string, newStage: string) => void;
  movingLeadId: string | null;
  formatCurrency: (value: number) => string;
}

function getCardBorderClass(stage: string) {
  if (stage === "closed_won") return "border-l-2 border-l-green-500";
  if (stage === "closed_lost") return "border-l-2 border-l-red-500";
  return "";
}

export function LeadPipelineCard({
  lead,
  stage,
  onEdit,
  onMoveStage,
  movingLeadId,
  formatCurrency,
}: LeadPipelineCardProps) {
  const otherStages = STAGES.filter((s) => s !== lead.stage);

  return (
    <Card
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors",
        getCardBorderClass(stage)
      )}
      onClick={onEdit}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <p className="font-medium text-sm">{lead.title}</p>
          <p className="text-xs text-muted-foreground">
            {lead.customer?.name ?? "—"}
          </p>
          {lead.value != null && lead.value > 0 && (
            <p className="flex items-center gap-1 text-xs">
              <DollarSign className="size-3" />
              {formatCurrency(lead.value)}
            </p>
          )}
          {lead.source && (
            <Badge variant="outline" className="text-xs">
              {lead.source}
            </Badge>
          )}
          <div className="flex items-center justify-between pt-1">
            {lead.assignedTo && (
              <Avatar size="sm" className="size-5">
                <AvatarImage src={lead.assignedTo.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {lead.assignedTo.fullName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2) ?? "—"}
                </AvatarFallback>
              </Avatar>
            )}
            <Select
              value=""
              onValueChange={(newStage) => onMoveStage(lead.id, newStage)}
            >
              <SelectTrigger
                className="h-6 w-auto border-0 p-0 shadow-none gap-0 [&>svg]:hidden"
                onClick={(e) => e.stopPropagation()}
                disabled={movingLeadId === lead.id}
              >
                {movingLeadId === lead.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </SelectTrigger>
              <SelectContent align="end" position="popper" onClick={(e) => e.stopPropagation()}>
                {otherStages.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
