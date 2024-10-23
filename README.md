# GitHub Actions for YDB SLO Testing

## Overview

This repository provides a set of GitHub Actions designed to integrate Service Level Objective (SLO) tests into the YDB database SDK. These Actions automate testing and continuous integration processes, ensuring that the SDK meets specified SLOs.

By deploying YDB in cluster mode, simulating user load, and introducing chaos testing, these Actions help verify the performance and reliability of applications under various scenarios.

## Actions

### 1. init Action

The init action initializes SLO tests by:

- Deploying Infrastructure: Automatically sets up the required infrastructure, including a YDB database in cluster mode.
- Chaos Testing Generator: Configures tools to introduce faults and simulate failure conditions.
- User Load Simulation: Generates user load to mimic real-world usage patterns during testing.

#### What It Does

- Sets up a test environment that mirrors production conditions.
- Enables testing under various stress and failure scenarios.
- Prepares the environment for SLO verification.

### 2. report Action

The report action generates detailed reports based on the test results by:

- Collecting Metrics: Gathers performance and reliability metrics from the SLO tests.
- Generating Markdown Report: Creates a comprehensive report in markdown format.
- Publishing Report: Automatically posts the report as a comment in the pull request or commit.

#### What It Does

- Provides actionable insights into the test outcomes.
- Facilitates quick feedback cycles by publishing reports directly in code reviews.
- Helps track SLO compliance over time.

## How to Use

To integrate these Actions into your project, follow these steps:

### Step 1: Add the Actions to Your Workflow

Create or modify your GitHub Actions workflow file (e.g., .github/workflows/slo-testing.yml) to include the init and report actions.

```yaml
name: SLO Testing

on:
  pull_request:
    branches:
      - main

jobs:
  slo-test:
    runs-on: ubuntu-latest
    steps:
      - name: Initialize Infrastructure
        uses: ydb-platform/ydb-slo-action/init@v1
        with:
          # Provide necessary inputs, e.g.:
          # ydb_cluster_config: 'configs/cluster.yml'
          # chaos_scenarios: 'configs/chaos.yml'

      - name: Run SLO Tests
        run: ./workload.sh

      - name: Generate and Publish Report
        uses: ydb-platform/ydb-slo-action/report@v1
        with:
          # Provide necessary inputs, e.g.:
          # metrics_source: 'metrics/results.json'
          # report_template: 'templates/report.md'
```

### Step 2: Configure Inputs

#### init Action Inputs

- ydb_cluster_config: Path to the YDB cluster configuration file.
- chaos_scenarios: Path to the chaos testing scenarios configuration.
- user_load_profile: Path to the user load simulation profile.

#### report Action Inputs

- metrics_source: Path to the collected metrics file.
- report_template: Path to the markdown template for the report.

### Step 3: Customize for Your Environment

Adjust the workflow and action inputs to match your environment and testing needs. This may involve:

- Setting environment variables.
- Modifying configuration files for cluster setup or load simulation.
- Adjusting test scripts or commands.

...`yaml
name: SLO Testing

on:
  pull_request:
    branches:
      - main

jobs:
  slo-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Initialize SLO Tests
        uses: ydb-platform/ydb-slo-action/init@v1
        with:
          ydb_cluster_config: 'configs/cluster.yml'
          chaos_scenarios: 'configs/chaos.yml'
          user_load_profile: 'configs/load.yml'

      - name: Run SLO Tests
        run: |
          # Script to execute SLO tests
          ./scripts/run-slo-tests.sh

      - name: Generate and Publish Report
        uses: ydb-platform/ydb-slo-action/report@v1
        with:
          metrics_source: 'metrics/results.json'
          report_template: 'templates/report.md'
`

## Additional Information

### Prerequisites

- Ensure your project includes the necessary scripts and configuration files for SLO testing.
- Make sure you have access to deploy and manage YDB instances.

### Customization

- Chaos Scenarios: Customize the chaos_scenarios file to define different failure conditions and stress tests.
- User Load Profiles: Adjust the user_load_profile to simulate various user behaviors and load patterns.
- Report Templates: Modify the report_template to include additional information or to match your project's style guidelines.

## Support

If you encounter any issues or have questions, please open an issue in this repository.

## License

This project is licensed under the MIT License.
