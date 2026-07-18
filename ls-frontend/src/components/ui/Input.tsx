'use client'
import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

/** Champ unifié : label + hint + erreur inline reliée par aria-describedby. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id || autoId
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-dark mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('input min-h-[44px]', error && 'input-error', className)}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'
