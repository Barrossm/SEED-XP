import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TagChipData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
}

const TagChip: React.FC<{ tag: TagChipData }> = ({ tag }) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border cursor-help"
            style={{
              backgroundColor: `${tag.color}22`,
              borderColor: `${tag.color}88`,
              color: "hsl(var(--primary))",
            }}
          >
            <span>{tag.icon}</span>
            {tag.name}
          </span>
        </TooltipTrigger>
        {tag.description && (
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{tag.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default TagChip;