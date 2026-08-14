const fs = require('fs');

const content = `import React, { useState } from 'react';
import { ToolEvent } from '../types';
import {
  FileText,
  Code2,
  Calendar,
  Trash2,
  FolderOpen,
  Terminal,
  Activity,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface StructuredEventsLogProps {
  events: ToolEvent[];
}

export const StructuredEventsLog: React.FC<StructuredEventsLogProps> = ({ events }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!events || events.length === 0) return null;

  const hasPending = events.some(e => e.status === 'pending');
  const cleanDisplay = hasPending ? 'Trabalhando no Workspace' : 'Trabalhou no Workspace';

  // Icons based on tool/event type
  const getEventIcon = (event: ToolEvent) => {
    const ev = event.event.toLowerCase();
    const tool = event.tool.toLowerCase();
    if (ev.includes('artifact') || tool.includes('workspace')) {
      if (ev.includes('created') || ev.includes('criou')) return <FileText className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400" />;
      if (ev.includes('deleted') || ev.includes('excluiu')) return <Trash2 className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400" />;
      return <FolderOpen className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400" />;
    }
    if (ev.includes('code') || tool.includes('code')) return <Code2 className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400" />;
    if (ev.includes('task') || tool.includes('scheduler')) return <Calendar className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400" />;
    return <Terminal className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400" />;
  };

  if (hasPending) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[14px] font-medium select-none my-1 searching">
        <Activity className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
        <span className="shimmer-text">{cleanDisplay}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1 w-full my-1 animate-fade-in">
      <div className="flex items-center justify-start py-0.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6b7076] hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors select-none p-0 bg-transparent border-0 cursor-pointer"
        >
          <Activity className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
          <span>{cleanDisplay}</span>
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400 shrink-0" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-1.5 pl-6 py-1 animate-fade-in">
          {events.map((event, idx) => (
            <div key={event.runId || idx} className="flex items-center gap-2 text-[13.5px] font-medium text-gray-800 dark:text-gray-200">
              {getEventIcon(event)}
              <span className="truncate">{event.details}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync('src/components/StructuredEventsLog.tsx', content);
console.log("StructuredEventsLog rewritten.");
