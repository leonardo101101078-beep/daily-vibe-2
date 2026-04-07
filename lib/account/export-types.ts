export type ExportBody = {
  sections: {
    profile: boolean
    taskTemplates: boolean
    dailyLogs: boolean
    dailyWellness: boolean
    dailyReviews: boolean
  }
  dateFrom?: string | null
  dateTo?: string | null
}
