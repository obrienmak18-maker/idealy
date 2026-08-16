import type { ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

type TerminalDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function TerminalDrawer({ open, onOpenChange, children }: TerminalDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[78vh] border-white/10 bg-[#090d14] text-white">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Terminal de validation</DrawerTitle>
          <DrawerDescription>Sortie de build et diagnostics du projet généré.</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 px-3 pb-3">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
