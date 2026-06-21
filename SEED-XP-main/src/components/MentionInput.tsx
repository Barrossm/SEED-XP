import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

interface ProfileSugg {
  user_id: string;
  username: string | null;
  full_name: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (val: string, mentioned: ProfileSugg[]) => void;
  placeholder?: string;
  rows?: number;
}

const MentionInput: React.FC<MentionInputProps> = ({ value, onChange, placeholder, rows = 4 }) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ProfileSugg[]>([]);
  const [mentioned, setMentioned] = useState<ProfileSugg[]>([]);

  useEffect(() => {
    if (query == null) { setSuggestions([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, full_name")
        .not("username", "is", null)
        .ilike("username", `${query}%`)
        .limit(6);
      if (!cancelled) setSuggestions((data as ProfileSugg[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [query]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    const caret = e.target.selectionStart;
    const upto = v.slice(0, caret);
    const m = upto.match(/(?:^|\s)@([a-zA-Z0-9_.]{0,20})$/);
    setQuery(m ? m[1] : null);
    onChange(v, recomputeMentioned(v, mentioned));
  };

  const recomputeMentioned = (text: string, current: ProfileSugg[]) => {
    const usernames = [...text.matchAll(/@([a-zA-Z0-9_.]+)/g)].map((m) => m[1].toLowerCase());
    return current.filter((u) => u.username && usernames.includes(u.username.toLowerCase()));
  };

  const pick = (u: ProfileSugg) => {
    const ta = taRef.current;
    if (!ta || !u.username) return;
    const caret = ta.selectionStart;
    const upto = value.slice(0, caret);
    const after = value.slice(caret);
    const newUpto = upto.replace(/@([a-zA-Z0-9_.]{0,20})$/, `@${u.username} `);
    const newVal = newUpto + after;
    const updatedMentioned = [...mentioned.filter((m) => m.user_id !== u.user_id), u];
    setMentioned(updatedMentioned);
    setQuery(null);
    onChange(newVal, recomputeMentioned(newVal, updatedMentioned));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newUpto.length, newUpto.length);
    }, 0);
  };

  return (
    <div className="relative">
      <Textarea
        ref={taRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className="resize-none"
      />
      {query !== null && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-w-xs card-surface overflow-hidden">
          {suggestions.map((u) => (
            <button
              type="button"
              key={u.user_id}
              onClick={() => pick(u)}
              className="w-full text-left px-3 py-2 hover:bg-secondary text-sm flex flex-col"
            >
              <span className="font-semibold text-primary">@{u.username}</span>
              <span className="text-xs text-muted-foreground truncate">{u.full_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;