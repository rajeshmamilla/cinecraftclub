import React, { createContext, useContext, useState, useEffect } from 'react';

interface ResizableContextType {
  leftWidth: number;
  setLeftWidth: (width: number) => void;
  rightWidth: number;
  setRightWidth: (width: number) => void;
  activeHandle: 'left' | 'right' | null;
  setActiveHandle: (handle: 'left' | 'right' | null) => void;
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
  const [leftWidth, setLeftWidth] = useState(280); // Default size for left side bar (My Groups)
  const [rightWidth, setRightWidth] = useState(340); // Default size for right side bar (Movie Metadata)
  const [activeHandle, setActiveHandle] = useState<'left' | 'right' | null>(null);

  return (
    <ResizableContext.Provider value={{ leftWidth, setLeftWidth, rightWidth, setRightWidth, activeHandle, setActiveHandle }}>
      <div className={`flex w-full h-full select-none ${className}`}>
        {children}
      </div>
    </ResizableContext.Provider>
  );
}

export function ResizablePanel({
  children,
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

  if (id === 'sidebar') {
    return (
      <div
        style={{ width: `${context.leftWidth}px` }}
        className={`shrink-0 overflow-hidden flex flex-col h-full ${className}`}
      >
        {children}
      </div>
    );
  }

  if (id === 'right-sidebar') {
    return (
      <div
        style={{ width: `${context.rightWidth}px` }}
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
  id,
}: {
  withHandle?: boolean;
  className?: string;
  id?: 'left' | 'right';
}) {
  const context = useContext(ResizableContext);
  if (!context) {
    throw new Error('ResizableHandle must be used within a ResizablePanelGroup');
  }

  const { setLeftWidth, setRightWidth, activeHandle, setActiveHandle } = context;
  const isDragging = activeHandle === id;

  useEffect(() => {
    if (!isDragging || !id) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (id === 'left') {
        const newWidth = Math.max(200, Math.min(450, e.clientX));
        setLeftWidth(newWidth);
      } else if (id === 'right') {
        const newWidth = Math.max(240, Math.min(500, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setActiveHandle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, id, setLeftWidth, setRightWidth, setActiveHandle]);

  return (
    <div
      onMouseDown={() => id && setActiveHandle(id)}
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
