"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  LinkIcon,
  RemoveFormatting,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Code,
  ImageIcon,
  Highlighter,
  Palette,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: "underline text-primary cursor-pointer" },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: true, allowBase64: true }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[160px] px-3 py-2 focus:outline-none",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5",
          "[&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold",
          "[&_p]:my-1 [&_hr]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
          "[&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-sm",
          "[&_img]:max-w-full [&_img]:rounded [&_img]:my-2"
        ),
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("URL:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    imageInputRef.current?.click();
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        editor.chain().focus().setImage({ src: reader.result }).run();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const setColor = () => {
    const color = window.prompt("Color (hex):", "#000000");
    if (color) {
      editor.chain().focus().setColor(color).run();
    }
  };

  const Btn = ({ active, onClick, disabled, label, children }: { active?: boolean; onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) => (
    <Toggle size="sm" pressed={active} onPressedChange={onClick} disabled={disabled} aria-label={label} className="h-7 w-7 p-0">
      {children}
    </Toggle>
  );

  const ico = "size-3.5";

  return (
    <div className={cn("border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-ring", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b bg-muted/30">
        {/* Text formatting */}
        <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold"><Bold className={ico} /></Btn>
        <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic"><Italic className={ico} /></Btn>
        <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline"><UnderlineIcon className={ico} /></Btn>
        <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough"><Strikethrough className={ico} /></Btn>
        <Btn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} label="Inline Code"><Code className={ico} /></Btn>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        {/* Headings */}
        <Btn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="Heading 1"><Heading1 className={ico} /></Btn>
        <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading 2"><Heading2 className={ico} /></Btn>
        <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Heading 3"><Heading3 className={ico} /></Btn>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        {/* Alignment */}
        <Btn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} label="Align Left"><AlignLeft className={ico} /></Btn>
        <Btn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} label="Align Center"><AlignCenter className={ico} /></Btn>
        <Btn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} label="Align Right"><AlignRight className={ico} /></Btn>
        <Btn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} label="Justify"><AlignJustify className={ico} /></Btn>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        {/* Lists & Blocks */}
        <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet List"><List className={ico} /></Btn>
        <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Ordered List"><ListOrdered className={ico} /></Btn>
        <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Blockquote"><Quote className={ico} /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider"><Minus className={ico} /></Btn>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        {/* Color & Highlight */}
        <Btn onClick={setColor} label="Text Color"><Palette className={ico} /></Btn>
        <Btn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()} label="Highlight"><Highlighter className={ico} /></Btn>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        {/* Insert */}
        <Btn active={editor.isActive("link")} onClick={addLink} label="Link"><LinkIcon className={ico} /></Btn>
        <Btn onClick={addImage} label="Insert Image"><ImageIcon className={ico} /></Btn>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        {/* Utilities */}
        <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} label="Clear Formatting"><RemoveFormatting className={ico} /></Btn>
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo"><Undo className={ico} /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo"><Redo className={ico} /></Btn>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
    </div>
  );
}
