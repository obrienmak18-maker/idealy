import type { ReactNode } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

type CanvasPanelLayoutProps = {
  codeOpen: boolean;
  code: ReactNode;
  preview: ReactNode;
};

export function CanvasPanelLayout({ codeOpen, code, preview }: CanvasPanelLayoutProps) {
  return (
    <ResizablePanelGroup direction="horizontal">
      {codeOpen && (
        <>
          <ResizablePanel defaultSize={31} minSize={20} maxSize={45} collapsible collapsedSize={0} className="min-w-0">
            {code}
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      )}
      <ResizablePanel defaultSize={codeOpen ? 69 : 100} minSize={55} className="min-w-0">
        {preview}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
