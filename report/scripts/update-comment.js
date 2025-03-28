const { context, github } = require('@actions/github');

async function updateComment() {
  const prNumber = context.issue.number;
  const pagesUrl = `https://${context.repo.owner}.github.io/${context.repo.repo}`;
  const comment = `## SLO Test Results

### Success Rate
![Success Rate](${pagesUrl}/charts/success-rate.png)

### Operations Per Second
![Operations Per Second](${pagesUrl}/charts/ops.png)

### 95th Percentile Latency
![95th Percentile Latency](${pagesUrl}/charts/latency.png)`;

  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
    per_page: 100
  });

  const existingComment = comments.find(comment => comment.body.includes('## SLO Test Results'));

  if (existingComment) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existingComment.id,
      body: comment
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: comment
    });
  }
}

updateComment().catch(console.error); 