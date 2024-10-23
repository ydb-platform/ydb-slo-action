export type Metric = {
	id: string;
	query: string;
	description?: string;
}

export type MetricsDefinition = {
	metrics: Array<Metric>
}
