"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  ArrowRight,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Activity = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; avatarUrl?: string | null } | null;
  metadata?: unknown;
};

interface ActivityTimelineProps {
  brandId: string;
  entityType: "customer" | "lead" | "deal" | "ticket";
  entityId: string;
  activities?: Activity[];
  onActivityAdded?: () => void;
}

export function ActivityTimeline({
  brandId,
  entityType,
  entityId,
  activities: initialActivities,
  onActivityAdded,
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities || []);
  const [loading, setLoading] = useState(!initialActivities);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<string>("note");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initialActivities) {
      fetchActivities();
    }
  }, [entityId, brandId, entityType]);

  useEffect(() => {
    if (initialActivities) setActivities(initialActivities);
  }, [initialActivities]);

  async function fetchActivities() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/activities?brandId=${brandId}&entityType=${entityType}&entityId=${entityId}`
      );
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setSubmitting(true);
    try {
      const titleMap: Record<string, string> = {
        note: "Note added",
        call: "Call logged",
        email: "Email logged",
        meeting: "Meeting logged",
      };
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          entityType,
          entityId,
          type: noteType,
          title: titleMap[noteType] || "Note added",
          description: noteText.trim(),
        }),
      });
      if (res.ok) {
        const activity = await res.json();
        setActivities((prev) => [activity, ...prev]);
        setNoteText("");
        toast.success("Activity added");
        onActivityAdded?.();
      }
    } catch {
      toast.error("Failed to add activity");
    } finally {
      setSubmitting(false);
    }
  }

  const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    note: MessageSquare,
    call: Phone,
    email: Mail,
    meeting: Calendar,
    status_change: ArrowRight,
    assignment: ArrowRight,
  };

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={addNote}
            disabled={!noteText.trim() || submitting}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Add
          </Button>
        </div>
        <Textarea
          placeholder="Add a note, log a call, or record an activity..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      <Separator />

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-center py-6 text-sm text-muted-foreground">
          No activity yet
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = typeIcons[activity.type] || MessageSquare;
            return (
              <div key={activity.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <Avatar className="size-8">
                    <AvatarImage src={activity.user?.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {activity.user
                        ? getInitials(activity.user.fullName)
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-2 w-px flex-1 bg-border" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {activity.user?.fullName ?? "System"}
                    </span>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Icon className="size-3" />
                      {activity.type}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{activity.title}</p>
                  {activity.description && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
