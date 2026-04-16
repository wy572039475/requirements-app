import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from "lucide-react"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 flex items-start gap-3 shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-white border-gray-200 text-gray-900",
        success: "bg-green-50 border-green-200 text-green-900",
        warning: "bg-amber-50 border-amber-200 text-amber-900",
        danger: "bg-red-50 border-red-200 text-red-900",
        info: "bg-blue-50 border-blue-200 text-blue-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const iconMap = {
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
  default: Info,
}

interface AlertProps extends VariantProps<typeof alertVariants> {
  title?: string
  message: string
  onClose?: () => void
  autoClose?: boolean
  duration?: number
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant, title, message, onClose, autoClose = false, duration = 3000, className, ...props }, ref) => {
    const Icon = iconMap[variant || "default"]
    const [isVisible, setIsVisible] = React.useState(true)

    React.useEffect(() => {
      if (autoClose && duration > 0) {
        const timer = setTimeout(() => {
          handleClose()
        }, duration)
        return () => clearTimeout(timer)
      }
    }, [autoClose, duration])

    const handleClose = () => {
      setIsVisible(false)
      setTimeout(() => {
        onClose?.()
      }, 200)
    }

    if (!isVisible) return null

    const getIconColor = () => {
      switch (variant) {
        case 'success': return 'text-green-600'
        case 'warning': return 'text-amber-600'
        case 'danger': return 'text-red-600'
        case 'info': return 'text-blue-600'
        default: return 'text-gray-600'
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          alertVariants({ variant }),
          "animate-in slide-in-from-top-2 fade-in duration-300",
          "transition-all duration-300",
          className
        )}
        {...props}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", getIconColor())} />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
          )}
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 hover:bg-black/5 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    )
  }
)

Alert.displayName = "Alert"

export { Alert, alertVariants }
export type { AlertProps }
