import * as core from '@actions/core'
import * as github from '@actions/github'
import { expect, spyOn, test } from 'bun:test'

import { getWorkflowRunIds, removeSloLabel } from './github.js'

function run(id: number, name = 'SLO', number = id) {
	return {
		id,
		name,
		run_number: number,
		head_sha: 'revision',
		event: 'pull_request',
		status: 'completed',
		conclusion: 'success',
		pull_requests: [{ number: 737 }],
		head_repository: { owner: { login: 'contributor' } },
		head_branch: 'feature',
	}
}

async function withApi(
	inputs: Record<string, string>,
	source: ReturnType<typeof run> | undefined,
	response: (url: URL, method: string) => Response,
	check: () => Promise<void>
) {
	let payload = github.context.payload
	let inputSpy = spyOn(core, 'getInput').mockImplementation((name) =>
		name === 'github_token' ? 'token' : inputs[name] || ''
	)
	let client = github.getOctokit('token', {
		request: {
			fetch: async (url: string, options: RequestInit) => {
				let result = response(new URL(url), options.method || 'GET')
				Object.defineProperty(result, 'url', { value: url })
				return result
			},
		},
	})
	let clientSpy = spyOn(github, 'getOctokit').mockReturnValue(client)
	github.context.payload = {
		workflow_run: source,
		repository: { name: 'sdk', owner: { login: 'org' } },
	}
	try {
		await check()
	} finally {
		github.context.payload = payload
		clientSpy.mockRestore()
		inputSpy.mockRestore()
	}
}

function unexpected(url: URL): never {
	throw new Error(`Unexpected GitHub request: ${url}`)
}

test('explicit run IDs override automatic discovery and reject malformed IDs', async () => {
	await withApi({ github_run_id: '41, 42' }, run(50), unexpected, async () => {
		expect(await getWorkflowRunIds()).toEqual([41, 42])
	})
	for (let id of ['0', '1,', 'invalid']) {
		await withApi({ github_run_id: id }, run(50), unexpected, async () => {
			await expect(getWorkflowRunIds()).rejects.toThrow('Positive workflow run IDs')
		})
	}
})

test('latest same-revision Table and Topic runs are combined across API pages', async () => {
	let requests = 0
	await withApi(
		{ github_workflows: 'SLO, SLO YDB Topics' },
		run(20, 'SLO', 3),
		(url) => {
			requests++
			expect(url.searchParams.get('head_sha')).toBe('revision')
			expect(url.searchParams.get('event')).toBe('pull_request')
			expect(url.searchParams.get('status')).toBe('completed')
			let second = url.searchParams.get('page') === '2'
			return Response.json(
				{
					total_count: 8,
					workflow_runs: second
						? [
								{ ...run(22, 'SLO YDB Topics', 2), conclusion: 'failure' },
								run(21, 'SLO YDB Topics', 1),
							]
						: [
								run(10, 'SLO', 1),
								{ ...run(99, 'SLO', 99), head_sha: 'stale' },
								{ ...run(98, 'SLO', 98), event: 'push' },
								{ ...run(97, 'SLO', 97), conclusion: 'skipped' },
								{ ...run(96, 'SLO', 96), conclusion: 'cancelled' },
								run(95, 'SDK CI', 95),
							],
				},
				{
					headers: second ? {} : { link: `<${url}&page=2>; rel="next"` },
				}
			)
		},
		async () => {
			expect(await getWorkflowRunIds()).toEqual([20, 22])
			expect(requests).toBe(2)
		}
	)
})

test('workflow_run defaults to its source and ignores skipped or cancelled events', async () => {
	await withApi({}, run(42), unexpected, async () => {
		expect(await getWorkflowRunIds()).toEqual([42])
	})
	for (let conclusion of ['skipped', 'cancelled']) {
		await withApi({}, { ...run(42), conclusion }, unexpected, async () => {
			expect(await getWorkflowRunIds()).toEqual([])
		})
	}
})

test('label cleanup resolves fork PRs and does not remove an already absent label', async () => {
	for (let present of [false, true]) {
		let requests: string[] = []
		await withApi(
			{ remove_label: 'SLO' },
			{ ...run(42), pull_requests: [] },
			(url, method) => {
				requests.push(`${method} ${url.pathname}`)
				if (url.pathname.endsWith('/pulls')) {
					expect(url.searchParams.get('head')).toBe('contributor:feature')
					return Response.json([{ number: 737 }])
				}
				if (method === 'DELETE') {
					expect(url.pathname).toEndWith('/issues/737/labels/SLO')
					return Response.json([])
				}
				return Response.json(present ? [{ name: 'SLO' }] : [])
			},
			async () => {
				await removeSloLabel()
				expect(requests.filter((request) => request.startsWith('DELETE'))).toHaveLength(
					present ? 1 : 0
				)
			}
		)
	}
})
