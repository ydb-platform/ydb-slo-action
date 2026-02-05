export interface TestMetadata {
	pull?: number
	commit?: string
	repo_url?: string
	repo_full_name?: string
	run_id?: string
	run_url?: string
	workload: string
	start_time: string
	start_epoch_ms: number
	finish_time: string
	finish_epoch_ms: number
	duration_ms: number
	workload_current_ref?: string
	workload_baseline_ref?: string
}
