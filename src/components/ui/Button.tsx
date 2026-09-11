import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface BaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

/** 主操作：pill 形实底琥珀金，深色文字 + 金色辉光 */
export function PrimaryButton({ children, className = '', ...rest }: BaseProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-on-accent shadow-[0_4px_22px_rgb(242_178_52/0.35)] transition-all duration-150 hover:bg-accent-strong hover:shadow-[0_4px_28px_rgb(242_178_52/0.5)] active:scale-[0.98] ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** 次操作：发丝描边 pill */
export function GhostButton({ children, className = '', ...rest }: BaseProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full border border-border-strong px-4 py-1.5 text-sm text-primary transition-colors duration-150 hover:bg-raised ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * 统一「进入/开始」按钮：琥珀金竖向渐变 + 顶部高光 + 辉光 + 按下微沉。
 * 所有进入类动作（继续上课、开始练习、再练一次、继续下一课…）统一使用。
 */
export function EnterButton({ children, className = '', ...rest }: BaseProps) {
  return (
    <button
      className={`enter-btn inline-flex select-none items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold tracking-wide text-on-accent transition-all duration-150 hover:brightness-110 active:translate-y-[1px] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}