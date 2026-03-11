"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  ChevronUp,
  ChevronDown,
  Phone,
  Mail,
  Globe,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CHANNELS = [
  "LINE",
  "Facebook",
  "Instagram",
  "WhatsApp",
  "WeChat",
  "Telegram",
  "Phone",
  "Email",
  "Walk-in",
  "Other",
] as const;

const CHANNEL_COLORS: Record<string, string> = {
  LINE: "bg-green-500",
  Facebook: "bg-blue-600",
  Instagram: "bg-gradient-to-r from-purple-500 to-pink-500 bg-pink-500",
  WhatsApp: "bg-emerald-500",
  WeChat: "bg-green-600",
  Telegram: "bg-sky-500",
  Phone: "bg-slate-500",
  Email: "bg-amber-500",
  "Walk-in": "bg-violet-500",
  Other: "bg-gray-500",
};

interface ChatLogEntry {
  id: string;
  channel: string;
  senderName: string;
  message: string;
  sentAt: string;
  createdAt: string;
}

interface ChatLogSectionProps {
  entityType: "lead" | "customer";
  entityId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatLogSection({
  entityType,
  entityId,
  isOpen,
  onToggle,
}: ChatLogSectionProps) {
  const [logs, setLogs] = useState<ChatLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [channel, setChannel] = useState<string>("LINE");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [sentAt, setSentAt] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const apiBase = `/api/${entityType === "lead" ? "leads" : "customers"}/${entityId}/chat-logs`;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiBase);
      if (!res.ok) throw new Error();
      setLogs(await res.json());
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (isOpen && entityId) fetchLogs();
  }, [isOpen, entityId, fetchLogs]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = async () => {
    if (!senderName.trim() || !message.trim()) {
      toast.error("กรุณากรอกชื่อผู้ส่งและข้อความ");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          senderName: senderName.trim(),
          message: message.trim(),
          sentAt: sentAt || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setMessage("");
      setSentAt("");
      await fetchLogs();
      toast.success("บันทึก log สำเร็จ");
    } catch {
      toast.error("ไม่สามารถบันทึก log ได้");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (logId: string) => {
    try {
      const res = await fetch(`${apiBase}?logId=${logId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchLogs();
      toast.success("ลบ log สำเร็จ");
    } catch {
      toast.error("ไม่สามารถลบ log ได้");
    }
  };

  const groupByDate = (entries: ChatLogEntry[]) => {
    const groups: { date: string; entries: ChatLogEntry[] }[] = [];
    for (const entry of entries) {
      const dateStr = format(new Date(entry.sentAt), "d MMM yyyy");
      const last = groups[groups.length - 1];
      if (last?.date === dateStr) {
        last.entries.push(entry);
      } else {
        groups.push({ date: dateStr, entries: [entry] });
      }
    }
    return groups;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
          <span className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="size-4" /> Chat Log
            <Badge variant="secondary" className="ml-1 text-xs">{logs.length}</Badge>
          </span>
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1 pb-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-muted/20">
            {/* Chat area */}
            <div
              ref={scrollRef}
              className="h-[360px] overflow-y-auto p-3 space-y-1"
            >
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="size-10 mb-2 opacity-40" />
                  <p className="text-sm">ยังไม่มี log การสนทนา</p>
                  <p className="text-xs">เพิ่ม log ด้านล่าง</p>
                </div>
              ) : (
                groupByDate(logs).map((group) => (
                  <div key={group.date}>
                    {/* Date divider */}
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted">
                        {group.date}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {group.entries.map((entry) => (
                      <div key={entry.id} className="group mb-3">
                        <div className="flex items-start gap-2">
                          {/* Avatar / Channel icon */}
                          <div
                            className={cn(
                              "size-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5",
                              CHANNEL_COLORS[entry.channel] || "bg-gray-500"
                            )}
                          >
                            {entry.channel.charAt(0)}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Sender + channel + time */}
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-xs font-semibold">
                                {entry.senderName}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 px-1.5 font-normal"
                              >
                                {entry.channel}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(entry.sentAt), "HH:mm")}
                              </span>
                            </div>

                            {/* Message bubble */}
                            <div className="bg-background border rounded-lg rounded-tl-sm px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm max-w-[90%]">
                              {entry.message}
                            </div>
                          </div>

                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Input area */}
            <div className="border-t bg-background p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">ช่องทาง</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((ch) => (
                        <SelectItem key={ch} value={ch} className="text-xs">
                          {ch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">จากใคร</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="ชื่อผู้ส่ง"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">วันเวลา</Label>
                  <Input
                    type="datetime-local"
                    className="h-8 text-xs"
                    value={sentAt}
                    onChange={(e) => setSentAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Textarea
                  className="text-xs min-h-[36px] resize-none flex-1"
                  placeholder="พิมพ์ข้อความที่ต้องการบันทึก..."
                  rows={1}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleSubmit}
                  disabled={submitting || !senderName.trim() || !message.trim()}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
