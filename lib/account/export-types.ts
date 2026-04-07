export type ExportBody = {
  sections: {
    dailyLogs: boolean
    dailyWellness: boolean
    dailyReviews: boolean
    /** Legacy: ignored; kept for backward compatibility */
    profile?: boolean
    /** Legacy: ignored */
    taskTemplates?: boolean
  }
  dateFrom?: string | null
  dateTo?: string | null
}
