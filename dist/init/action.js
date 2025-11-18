import"../main-ynsbc1hx.js";

// init/action.yml
var name = "Setup & Run YDB", description = "Sets up YDB test environment with monitoring. Collects and uploads metrics during cleanup.", inputs = {
  github_pull_request_number: {
    description: "The number of the associated pull request. If not provided, the action will attempt to infer it automatically.",
    required: !1
  },
  github_token: {
    description: "GitHub token used to access the GitHub API for inferring the pull request number.",
    required: !1
  },
  workload_name: {
    description: "The name of the workload used by the user to generate load on the YDB database.",
    required: !0
  },
  metrics_yaml: {
    description: "Custom metrics configuration in YAML format (inline). Will be merged with default metrics.",
    required: !1
  },
  metrics_yaml_path: {
    description: "Path to a file containing custom metrics configuration in YAML format. Will be merged with default metrics.",
    required: !1
  }
}, runs = {
  using: "node24",
  main: "../dist/init/main.js",
  post: "../dist/init/post.js"
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

//# debugId=CB8291959ED8089A64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFtdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICBdLAogICJtYXBwaW5ncyI6ICIiLAogICJkZWJ1Z0lkIjogIkNCODI5MTk1OUVEODA4OUE2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
