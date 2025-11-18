import"../main-ynsbc1hx.js";

// report/action.yml
var name = "Generate & Publish Report", description = "Analyzes metrics, compares results with the base branch, and publishes a detailed report to the pull request.", inputs = {
  github_token: {
    description: "GitHub token used to access the GitHub API for inferring the pull request number.",
    required: !0
  },
  github_run_id: {
    description: "The id of the workflow run where the desired download artifact was uploaded from.",
    required: !0
  }
}, runs = {
  using: "node24",
  main: "../dist/report/main.js"
}, action_default = {
  name,
  description,
  inputs,
  runs
};
export {
  runs,
  name,
  inputs,
  description,
  action_default as default
};

//# debugId=A3A810BC3954F94764756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFtdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICBdLAogICJtYXBwaW5ncyI6ICIiLAogICJkZWJ1Z0lkIjogIkEzQTgxMEJDMzk1NEY5NDc2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
