import { forwardRef, InputHTMLAttributes } from 'react';
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || Math.random().toString(36).substr(2, 9);
    return (
      <div className="w-full">
        {label &&
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-stone-700 mb-1">
          
            {label}
          </label>
        }
        <input
          id={inputId}
          ref={ref}
          className={`block w-full rounded-lg border-stone-300 border px-4 py-2 text-stone-900 shadow-sm focus:border-craft-primary focus:ring-craft-primary sm:text-sm transition-colors ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
          {...props} />
        
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>);

  }
);
Input.displayName = 'Input';