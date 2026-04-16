import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Requirements from './pages/Requirements'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import NotificationProvider from './components/NotificationProvider'
import ToastProvider from './components/ToastProvider'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/requirements" replace />} />
                <Route path="requirements" element={<Requirements />} />
              </Route>

              <Route path="*" element={
                <ProtectedRoute>
                  <Layout>
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">页面未找到</h2>
                        <p className="text-gray-600 mt-2">抱歉，您访问的页面不存在。</p>
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </NotificationProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
