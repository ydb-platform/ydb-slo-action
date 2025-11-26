export interface TestMetadata {
	pull?: number
	commit?: string
	workload: string
	start_time: string
	start_epoch_ms: number
	finish_time: string
	finish_epoch_ms: number
	duration_ms: number
	workload_current_ref?: string
	workload_baseline_ref?: string
}
