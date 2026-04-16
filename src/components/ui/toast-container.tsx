import React from 'react'
import { createRoot } from 'react-dom/client'
import { Alert } from './alert'

export interface ToastOptions {
  title?: string
  message: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  duration?: number
  autoClose?: boolean
}

let toastContainer: HTMLDivElement | null = null
let toastRoot: any = null

// 确保只创建一个 toast 容器
const ensureToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'toast-container'
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `
    document.body.appendChild(toastContainer)
    toastRoot = createRoot(toastContainer)
  }
  return toastContainer
}

// 添加 toast 到容器
const addToast = (options: ToastOptions) => {
  ensureToastContainer()

  const toastId = `toast-${Date.now()}-${Math.random()}`
  const toastElement = document.createElement('div')
  toastElement.id = toastId
  toastElement.style.cssText = 'pointer-events: auto;'

  const handleClose = () => {
    const element = document.getElementById(toastId)
    if (element) {
      element.style.opacity = '0'
      element.style.transform = 'translateX(100%)'
      setTimeout(() => {
        element.remove()
      }, 200)
    }
  }

  toastRoot.render(
    React.createElement(Alert, {
      variant: options.variant || 'default',
      title: options.title,
      message: options.message,
      autoClose: options.autoClose ?? true,
      duration: options.duration || 3000,
      onClose: handleClose,
    })
  )

  // 将 toast 元素添加到容器
  toastContainer?.appendChild(toastElement)

  return handleClose
}

// 显示成功提示
export const toast = {
  success: (message: string, title?: string) => {
    return addToast({ message, title, variant: 'success' })
  },
  
  error: (message: string, title?: string) => {
    return addToast({ message, title, variant: 'danger', duration: 5000 })
  },
  
  warning: (message: string, title?: string) => {
    return addToast({ message, title, variant: 'warning' })
  },
  
  info: (message: string, title?: string) => {
    return addToast({ message, title, variant: 'info' })
  },
  
  default: (message: string, title?: string) => {
    return addToast({ message, title, variant: 'default' })
  },

  show: (options: ToastOptions) => {
    return addToast(options)
  }
}

// 显示 alert 提示（替代原生 alert）
export const alert = {
  show: (message: string, title?: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastFn = toast[type] || toast.info
    return toastFn(message, title)
  },
  
  success: (message: string, title?: string) => {
    return toast.success(message, title)
  },
  
  error: (message: string, title?: string) => {
    return toast.error(message, title)
  },
  
  warning: (message: string, title?: string) => {
    return toast.warning(message, title)
  },
  
  info: (message: string, title?: string) => {
    return toast.info(message, title)
  }
}

export default toast
