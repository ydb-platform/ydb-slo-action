import { context, getOctokit } from '@actions/github';
export async function getCurrentWorkflowRuns(token, branch) {
    let { data: { workflows }, } = await getOctokit(token).rest.actions.listRepoWorkflows({
        owner: context.repo.owner,
        repo: context.repo.repo,
    });
    let workflow = workflows.find((workflow) => workflow.name === context.workflow);
    if (!workflow) {
        return [];
    }
    let { data: { workflow_runs }, } = await getOctokit(token).rest.actions.listWorkflowRuns({
        owner: context.repo.owner,
        repo: context.repo.repo,
        workflow_id: workflow.id,
        branch: branch,
        status: 'completed',
    });
    return workflow_runs.filter((run) => run.conclusion === 'success');
}
