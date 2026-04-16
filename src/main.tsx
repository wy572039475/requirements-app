import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 仅在 iframe 嵌入模式下监听来自主站的 postMessage，接收项目上下文
function setupParentMessageListener() {
  window.addEventListener('message', (event) => {
    const isLocalhost =
      event.origin.startsWith('http://localhost') ||
      event.origin.startsWith('http://127.0.0.1')

    if (!isLocalhost) return

    const message = event.data

    if (message.type === 'SET_PROJECT') {
      const { projectId } = message.data || {}
      if (projectId) {
        sessionStorage.setItem('embedProjectId', projectId)
        console.log('[需求管理] 已设置项目上下文:', projectId)
      }
    }
  })
}

// 通知主站子应用已就绪
if (window.self !== window.top) {
  setupParentMessageListener()
  setTimeout(() => {
    const parentOrigin = document.referrer
      ? new URL(document.referrer).origin
      : 'http://localhost:5173'
    window.parent.postMessage({ type: 'REQUIREMENTS_READY' }, parentOrigin)
  }, 500)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
