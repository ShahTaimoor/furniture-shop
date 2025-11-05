import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)"
        }
      }
      toastOptions={{
        duration: 3000,
        style: {
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        success: {
          iconTheme: {
            primary: '#dc2626',
            secondary: 'white',
          },
        },
        error: {
          iconTheme: {
            primary: '#dc2626',
            secondary: 'white',
          },
        },
      }}
      {...props} />
  );
}

export { Toaster }
