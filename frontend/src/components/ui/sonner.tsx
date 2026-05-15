'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:p-5 group-[.toaster]:w-[380px] group-[.toaster]:transition-all flex items-start gap-4',
          content: 'flex flex-col gap-1.5 flex-1',
          title: 'group-[.toast]:text-base group-[.toast]:font-semibold group-[.toast]:text-foreground group-[.toast]:leading-tight',
          description: 'group-[.toast]:text-sm group-[.toast]:text-muted-foreground group-[.toast]:leading-relaxed',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium group-[.toast]:rounded-md group-[.toast]:px-4 group-[.toast]:py-1.5 group-[.toast]:text-sm transition-colors hover:group-[.toast]:bg-primary/90 mt-2',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-medium group-[.toast]:rounded-md group-[.toast]:px-4 group-[.toast]:py-1.5 group-[.toast]:text-sm transition-colors hover:group-[.toast]:bg-muted/80 mt-2',
          closeButton: 'group-[.toast]:!bg-transparent group-[.toast]:!border-none group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground hover:group-[.toast]:!bg-muted/50 transition-colors rounded-md group-[.toast]:!p-1.5 group-[.toast]:!right-3 group-[.toast]:!top-3 opacity-0 group-hover:opacity-100',
          icon: 'group-[.toast]:mr-0 flex-shrink-0',
          success: 'group-[.toast]:!border-l-4 group-[.toast]:!border-l-emerald-500',
          error: 'group-[.toast]:!border-l-4 group-[.toast]:!border-l-destructive',
          warning: 'group-[.toast]:!border-l-4 group-[.toast]:!border-l-amber-500',
          info: 'group-[.toast]:!border-l-4 group-[.toast]:!border-l-blue-500',
        },
      }}
      icons={{
        success: (
          <div className="rounded-full bg-emerald-500/15 p-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
        ),
        error: (
          <div className="rounded-full bg-destructive/15 p-2"><XCircle className="h-5 w-5 text-destructive" /></div>
        ),
        warning: (
          <div className="rounded-full bg-amber-500/15 p-2"><AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
        ),
        info: (
          <div className="rounded-full bg-blue-500/15 p-2"><Info className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
        ),
      }}
      {...props}
    />
  )
}

export { Toaster }
