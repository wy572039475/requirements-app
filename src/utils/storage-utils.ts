const STORAGE_KEYS = {
  REVIEWS: 'req-app-reviews',
  ANALYSIS_HISTORY: 'req-app-analysis-history'
}

export function loadReviewsFromStorage(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REVIEWS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('[Storage] Failed to load reviews:', error)
    return []
  }
}

export function saveReviewsToStorage(reviews: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews))
  } catch (error) {
    console.error('[Storage] Failed to save reviews:', error)
  }
}

export function loadAnalysisHistory(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ANALYSIS_HISTORY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('[Storage] Failed to load analysis history:', error)
    return []
  }
}

export function saveAnalysisHistory(history: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ANALYSIS_HISTORY, JSON.stringify(history))
  } catch (error) {
    console.error('[Storage] Failed to save analysis history:', error)
  }
}

export function clearAllStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.REVIEWS)
    localStorage.removeItem(STORAGE_KEYS.ANALYSIS_HISTORY)
  } catch (error) {
    console.error('[Storage] Failed to clear storage:', error)
  }
}
