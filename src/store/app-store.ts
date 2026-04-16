import { create } from 'zustand'

interface AppState {
  currentModule: 'dashboard' | 'requirements' | 'projects' | 'team'
  sidebarCollapsed: boolean
  setCurrentModule: (module: AppState['currentModule']) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentModule: 'dashboard',
  sidebarCollapsed: false,
  setCurrentModule: (module) => set({ currentModule: module }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))