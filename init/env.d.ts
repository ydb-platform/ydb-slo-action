declare global {
	namespace NodeJS {
		interface ProcessEnv {
			CI: string
			GITHUB_ACTION: string
			GITHUB_ACTION_PATH: string
			GITHUB_ACTION_REPOSITORY: string
			GITHUB_ACTIONS: string
			GITHUB_ACTOR: string
			GITHUB_ACTOR_ID: string
			GITHUB_API_URL: string
			GITHUB_BASE_REF: string
			GITHUB_ENV: string
			GITHUB_EVENT_NAME: string
			GITHUB_EVENT_PATH: string
			GITHUB_GRAPHQL_URL: string
			GITHUB_HEAD_REF: string
			GITHUB_JOB: string
			GITHUB_OUTPUT: string
			GITHUB_PATH: string
			GITHUB_REF: string
			GITHUB_REF_NAME: string
			GITHUB_REF_PROTECTED: string
			GITHUB_REF_TYPE: string
			GITHUB_REPOSITORY: string
			GITHUB_REPOSITORY_ID: string
			GITHUB_REPOSITORY_OWNER: string
			GITHUB_REPOSITORY_OWNER_ID: string
			GITHUB_RETENTION_DAYS: string
			GITHUB_RUN_ATTEMPT: string
			GITHUB_RUN_ID: string
			GITHUB_RUN_NUMBER: string
			GITHUB_SERVER_URL: string
			GITHUB_SHA: string
			GITHUB_STEP_SUMMARY: string
			GITHUB_TRIGGERING_ACTOR: string
			GITHUB_WORKFLOW: string
			GITHUB_WORKFLOW_REF: string
			GITHUB_WORKFLOW_SHA: string
			GITHUB_WORKSPACE: string
			RUNNER_ARCH: string
			RUNNER_DEBUG: string
			RUNNER_NAME: string
			RUNNER_OS: string
			RUNNER_TEMP: string
			RUNNER_TOOL_CACHE: string
		}
	}
}

export {}
