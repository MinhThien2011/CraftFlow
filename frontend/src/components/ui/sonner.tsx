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
            'group toast group-[.toaster]:bg-background/70 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-white/20 dark:group-[.toaster]:border-white/10 group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:w-[350px] group-[.toaster]:transition-all group-[.toaster]:duration-300 flex items-start gap-4 overflow-hidden',
          content: 'flex flex-col gap-1 flex-1 justify-center',
          title: 'group-[.toast]:text-sm group-[.toast]:font-bold group-[.toast]:text-foreground group-[.toast]:leading-tight tracking-wide',
          description: 'group-[.toast]:text-xs group-[.toast]:text-muted-foreground group-[.toast]:leading-relaxed',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-1.5 group-[.toast]:text-xs transition-all hover:group-[.toast]:scale-105 mt-2',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-medium group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-1.5 group-[.toast]:text-xs transition-colors hover:group-[.toast]:bg-muted/80 mt-2',
          closeButton: 'group-[.toast]:!bg-transparent group-[.toast]:!border-none group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground transition-colors rounded-full group-[.toast]:!p-1 group-[.toast]:!right-2 group-[.toast]:!top-2 opacity-0 group-hover:opacity-100',
          icon: 'group-[.toast]:mr-0 flex-shrink-0 mt-0.5',
          success: 'group-[.toast]:!bg-emerald-500/10 group-[.toast]:!border-emerald-500/30 dark:group-[.toast]:!bg-emerald-950/30 dark:group-[.toast]:!border-emerald-500/20',
          error: 'group-[.toast]:!bg-rose-500/10 group-[.toast]:!border-rose-500/30 dark:group-[.toast]:!bg-rose-950/30 dark:group-[.toast]:!border-rose-500/20',
          warning: 'group-[.toast]:!bg-amber-500/10 group-[.toast]:!border-amber-500/30 dark:group-[.toast]:!bg-amber-950/30 dark:group-[.toast]:!border-amber-500/20',
          info: 'group-[.toast]:!bg-blue-500/10 group-[.toast]:!border-blue-500/30 dark:group-[.toast]:!bg-blue-950/30 dark:group-[.toast]:!border-blue-500/20',
        },
      }}
      icons={{
        success: (
          <div className="rounded-full bg-emerald-500/20 p-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"><CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
        ),
        error: (
          <div className="rounded-full bg-rose-500/20 p-2 shadow-[0_0_15px_rgba(244,63,94,0.2)]"><XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" /></div>
        ),
        warning: (
          <div className="rounded-full bg-amber-500/20 p-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]"><AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
        ),
        info: (
          <div className="rounded-full bg-blue-500/20 p-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]"><Info className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
        ),
      }}
      {...props}
    />
  )
}

export { Toaster }
