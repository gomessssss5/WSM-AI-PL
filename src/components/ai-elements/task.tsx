import React, { useState } from "react";
import { ChevronDown, ChevronRight, File } from "lucide-react";

export function Task({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { isOpen, setIsOpen });
        }
        return child;
      })}
    </div>
  );
}

export function TaskTrigger({ title, isOpen, setIsOpen }: { title: string; isOpen?: boolean; setIsOpen?: (v: boolean) => void }) {
  return (
    <button
      onClick={() => setIsOpen?.(!isOpen)}
      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        {title}
      </div>
    </button>
  );
}

export function TaskContent({ children, isOpen }: { children: React.ReactNode; isOpen?: boolean }) {
  if (!isOpen) return null;
  return <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 bg-gray-50/50 dark:bg-gray-800/20">{children}</div>;
}

export function TaskItem({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">{children}</div>;
}

export function TaskItemFile({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs text-gray-700 dark:text-gray-300 shadow-sm">
      {children}
    </div>
  );
}
