"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  MessageCircleMore,
  Send,
  Trash2,
  Pencil,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

interface CommentEntry {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

interface CommentSectionProps {
  entityType: "lead" | "customer";
  entityId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function CommentSection({
  entityType,
  entityId,
  isOpen,
  onToggle,
}: CommentSectionProps) {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id;
  const isSuperAdmin = (sessionData?.user as { isSuperAdmin?: boolean })?.isSuperAdmin;

  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const apiBase = `/api/${entityType === "lead" ? "leads" : "customers"}/${entityId}/comments`;

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiBase);
      if (!res.ok) throw new Error();
      setComments(await res.json());
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (isOpen && entityId) fetchComments();
  }, [isOpen, entityId, fetchComments]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast.error("กรุณากรอกข้อความ");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error();
      setText("");
      await fetchComments();
      toast.success("เพิ่ม comment สำเร็จ");
    } catch {
      toast.error("ไม่สามารถเพิ่ม comment ได้");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const res = await fetch(`${apiBase}?commentId=${commentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
      await fetchComments();
      toast.success("ลบ comment สำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ไม่สามารถลบ comment ได้");
    }
  };

  const startEdit = (comment: CommentEntry) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleEdit = async () => {
    if (!editingId || !editText.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`${apiBase}?commentId=${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
      setEditingId(null);
      setEditText("");
      await fetchComments();
      toast.success("แก้ไข comment สำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ไม่สามารถแก้ไข comment ได้");
    } finally {
      setEditSaving(false);
    }
  };

  const canModify = (comment: CommentEntry) => {
    return comment.user.id === currentUserId || isSuperAdmin;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
          <span className="flex items-center gap-2 text-sm font-medium">
            <MessageCircleMore className="size-4" /> Comments
            <Badge variant="secondary" className="ml-1 text-xs">
              {comments.length}
            </Badge>
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
            {/* Comments list */}
            <div ref={scrollRef} className="max-h-[400px] overflow-y-auto p-3 space-y-3">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MessageCircleMore className="size-10 mb-2 opacity-40" />
                  <p className="text-sm">ยังไม่มี comment</p>
                  <p className="text-xs">เพิ่ม comment ด้านล่าง</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="group">
                    <div className="flex gap-2.5">
                      {/* Avatar */}
                      {comment.user.avatarUrl ? (
                        <img
                          src={comment.user.avatarUrl}
                          alt={comment.user.fullName}
                          className="size-8 rounded-full object-cover shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {getInitials(comment.user.fullName)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Header: name + time */}
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold">
                            {comment.user.fullName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(comment.createdAt), "d MMM yyyy HH:mm")}
                          </span>
                          {comment.createdAt !== comment.updatedAt && (
                            <span className="text-[10px] text-muted-foreground italic">
                              (แก้ไขแล้ว)
                            </span>
                          )}
                        </div>

                        {/* Body: text or edit form */}
                        {editingId === comment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              className="text-xs min-h-[60px] resize-none"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleEdit();
                                }
                                if (e.key === "Escape") cancelEdit();
                              }}
                            />
                            <div className="flex gap-1.5 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={cancelEdit}
                              >
                                <X className="size-3" />
                                ยกเลิก
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleEdit}
                                disabled={editSaving || !editText.trim()}
                              >
                                {editSaving && <Loader2 className="size-3 animate-spin" />}
                                บันทึก
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-background border rounded-lg rounded-tl-sm px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm">
                            {comment.text}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {canModify(comment) && editingId !== comment.id && (
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(comment)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(comment.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input area */}
            <div className="border-t bg-background p-3">
              <div className="flex gap-2">
                <Textarea
                  className="text-xs min-h-[36px] resize-none flex-1"
                  placeholder="พิมพ์ comment..."
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
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
                  disabled={submitting || !text.trim()}
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
