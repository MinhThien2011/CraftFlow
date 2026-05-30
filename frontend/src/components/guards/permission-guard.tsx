import React, { Suspense } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { Skeleton } from '@/components/ui/skeleton'

interface PermissionGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGuard({
  allowedRoles,
  children,
  fallback = null
}: PermissionGuardProps) {
  const { role, loading } = useAuth()

  if (loading) {
    return <Skeleton className="h-full w-full" />
  }

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: string[]
) {
  return function ProtectedComponent(props: P) {
    return (
      <PermissionGuard allowedRoles={allowedRoles}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}

export function LazyFeature({ 
  children, 
  fallback = <Skeleton className="h-[200px] w-full" /> 
}: { 
  children: React.ReactNode, 
  fallback?: React.ReactNode 
}) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
}
