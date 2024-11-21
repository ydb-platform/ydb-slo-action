export type Series = {
	metric: Record<string, string>
	values: [number, string][] // [timestamp (sec), value (float)]
}

export type Metrics = Record<string, Series[]>
