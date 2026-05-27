import React from 'react';
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface WorkflowStage {
  id: string;
  label: string;
  status: 'draft' | 'processing' | 'pending_review' | 'pending_approval' | 'completed' | 'active';
}

interface WorkflowTimelineProps {
  stages: WorkflowStage[];
  currentStageId: string;
}

export function WorkflowTimeline({ stages, currentStageId }: WorkflowTimelineProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStageId);

  return (
    <div className="flex flex-col space-y-0">
      {stages.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={stage.id} className="relative flex gap-4 pb-8 last:pb-0">
            {index !== stages.length - 1 && (
              <div 
                className={cn(
                  "absolute left-[11px] top-6 h-[calc(100%-16px)] w-[2px]",
                  isCompleted ? "bg-blue-600" : "bg-slate-200"
                )} 
              />
            )}
            
            <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
              {isCompleted ? (
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              ) : isCurrent ? (
                <div className="h-6 w-6 rounded-full border-2 border-blue-600 flex items-center justify-center bg-blue-50">
                   <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                </div>
              ) : (
                <Circle className="h-6 w-6 text-slate-300" />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span 
                className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-blue-600" : isCompleted ? "text-slate-900" : "text-slate-500"
                )}
              >
                {stage.label}
              </span>
              {isCurrent && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  In progress
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
