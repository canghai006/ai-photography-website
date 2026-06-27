export type AnalysisRecord = {
  id: string
  createdAt: string
  imageUrl: string
  filename: string
  mimeType: string
  overallScore: number
  tags: string[]
  scores: Record<string, number>
  sections: Record<string, string>
  source?: string
  error?: string
}
