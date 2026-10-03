import { Toaster as SonnerToaster, type ToasterProps, toast } from 'sonner';

/** Renders toast notifications. Mount once near the app root; show toasts with `toast(...)`. */
export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: 'border bg-popover text-popover-foreground shadow-lg',
          actionButton: 'bg-primary text-primary-foreground',
        },
      }}
      {...props}
    />
  );
}

export { toast };
