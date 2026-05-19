import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface ResizableContextType {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

const ResizableContext = createContext<ResizableContextType | undefined>(undefined);

export function ResizablePanelGroup({
  children,
  className = '',
}: {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(280); // Default elegant width for sidebar
  const [isDragging, setIsDragging] = useState(false);

  return (
    <ResizableContext.Provider value={{ sidebarWidth, setSidebarWidth, isDragging, setIsDragging }}>
      <div className={`flex w-full h-full select-none ${className}`}>
        {children}
      </div>
    </ResizableContext.Provider>
  );
}

export function ResizablePanel({
  children,
  defaultSize,
  className = '',
  id,
}: {
  children: React.ReactNode;
  defaultSize?: string | number;
  className?: string;
  id?: string;
}) {
  const context = useContext(ResizableContext);
  if (!context) {
    throw new Error('ResizablePanel must be used within a ResizablePanelGroup');
  }

  // Treat as sidebar if it has defaultSize around 25% or specifically marked
  const isSidebar = defaultSize === '25%' || defaultSize === 25 || id === 'sidebar' || className.includes('sidebar') || !className.includes('flex-1');

  if (isSidebar) {
    return (
      <div
        style={{ width: `${context.sidebarWidth}px` }}
        className={`shrink-0 overflow-hidden flex flex-col h-full ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={`flex-1 min-w-0 overflow-hidden flex flex-col h-full ${className}`}>
      {children}
    </div>
  );
}

export function ResizableHandle({
  withHandle,
  className = '',
}: {
  withHandle?: boolean;
  className?: string;
}) {
  const context = useContext(ResizableContext);
  if (!context) {
    throw new Error('ResizableHandle must be used within a ResizablePanelGroup');
  }

  const { setSidebarWidth, isDragging, setIsDragging } = context;
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Dynamic resizable bounds: min 220px, max 480px
      const newWidth = Math.max(220, Math.min(480, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setSidebarWidth, setIsDragging]);

  return (
    <div
      ref={handleRef}
      onMouseDown={() => setIsDragging(true)}
      className={`w-[3px] hover:w-[6px] bg-border hover:bg-primary/50 cursor-col-resize transition-all duration-200 relative flex items-center justify-center z-50 ${
        isDragging ? 'bg-primary w-[6px]' : ''
      } ${className}`}
    >
      {withHandle && (
        <div className="absolute w-3.5 h-7 rounded-md bg-secondary border border-border flex flex-col gap-0.5 items-center justify-center shadow-lg pointer-events-none transition-transform duration-200 hover:scale-110">
          <div className="w-[1.5px] h-2 bg-muted-foreground/60 rounded-full" />
          <div className="w-[1.5px] h-2 bg-muted-foreground/60 rounded-full" />
        </div>
      )}
    </div>
  );
}
