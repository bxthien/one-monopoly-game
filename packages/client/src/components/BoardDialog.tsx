import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const BoardDialog: React.FC<Props> = ({ labelledBy, onClose, children }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl bg-transparent p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      {children}
    </dialog>,
    document.body
  );
};
