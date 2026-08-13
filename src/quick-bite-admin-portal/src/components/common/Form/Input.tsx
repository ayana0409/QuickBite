import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
  accentColor?: 'emerald' | 'cyan' | 'amber' | 'blue';
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      endIcon,
      accentColor = 'emerald',
      containerClassName = '',
      className = '',
      required,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    // Focus ring colors map
    const focusColorMap = {
      emerald: 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30',
      cyan: 'focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30',
      amber: 'focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30',
      blue: 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30',
    };

    const focusClass = focusColorMap[accentColor] || focusColorMap.emerald;

    return (
      <div className={`space-y-1 w-full ${containerClassName}`}>
        {/* Input Label */}
        {label && (
          <label className="font-bold text-xs text-slate-300 flex items-center justify-between">
            <span>
              {label}
              {required && <span className="text-red-400 font-black ml-1">*</span>}
            </span>
          </label>
        )}

        {/* Input Field Container */}
        <div className="relative flex items-center">
          {/* Left Icon */}
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            disabled={disabled}
            required={required}
            className={`w-full bg-slate-950 border text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2 transition-all focus:outline-none ${
              icon ? 'pl-9' : ''
            } ${endIcon ? 'pr-9' : ''} ${
              error
                ? 'border-red-500/80 ring-1 ring-red-500/30 text-red-200 bg-red-950/10'
                : `border-slate-800 ${focusClass}`
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-900' : ''} ${className}`}
            {...props}
          />

          {/* Right Icon / Error Icon */}
          {error ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : (
            endIcon && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {endIcon}
              </div>
            )
          )}
        </div>

        {/* Error Message or Helper Text */}
        {error ? (
          <p className="text-[11px] font-semibold text-red-400 flex items-center gap-1 animate-in fade-in-50 duration-200">
            <span>• {error}</span>
          </p>
        ) : (
          helperText && <p className="text-[11px] text-slate-500 font-sans">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
