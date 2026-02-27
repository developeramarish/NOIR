/**
 * Job Progress SSE Hook
 *
 * Convenience wrapper around useSse for tracking job/operation progress.
 * Subscribes to `/api/sse/channels/job-{jobId}` and extracts progress data.
 *
 * @example
 * ```tsx
 * const { progress, status, message, isConnected } = useJobProgress(importJobId)
 *
 * return (
 *   <div>
 *     <Progress value={progress} />
 *     <span>{status}: {message}</span>
 *   </div>
 * )
 * ```
 */
import { useState, useCallback } from 'react'
import { useSse } from '@/hooks/useSse'

export interface JobProgressPayload {
  /** Progress percentage (0-100) */
  progress: number
  /** Current status label (e.g. "processing", "completed", "failed") */
  status: string
  /** Optional human-readable message */
  message?: string
  /** Optional additional metadata */
  metadata?: Record<string, unknown>
}

export interface UseJobProgressReturn {
  /** Current progress percentage (0-100) */
  progress: number
  /** Current status label */
  status: string
  /** Optional status message */
  message: string | undefined
  /** Optional metadata from the latest event */
  metadata: Record<string, unknown> | undefined
  /** Whether SSE connection is active */
  isConnected: boolean
}

/**
 * Hook for tracking job progress via SSE.
 *
 * @param jobId - The job ID to track, or null to disable.
 */
export const useJobProgress = (jobId: string | null): UseJobProgressReturn => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('pending')
  const [message, setMessage] = useState<string | undefined>()
  const [metadata, setMetadata] = useState<Record<string, unknown> | undefined>()

  const handleMessage = useCallback((data: JobProgressPayload) => {
    if (typeof data.progress === 'number') setProgress(data.progress)
    if (data.status) setStatus(data.status)
    setMessage(data.message)
    setMetadata(data.metadata)
  }, [])

  const url = jobId ? `/api/sse/channels/job-${jobId}` : null

  const { isConnected } = useSse<JobProgressPayload>(url, {
    onMessage: handleMessage,
  })

  return {
    progress,
    status,
    message,
    metadata,
    isConnected,
  }
}
