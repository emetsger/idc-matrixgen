# Test Matrix Generation for iDC

This is a Github action that is used to generate a matrix of tests for the iDC project.  By default, the action will discover test controllers matching `*.sh` in the `tests/` directory and include them in the test matrix.

The test matrix is based on file matching; more sophisticated usage allows for customizing a test matrix based on file names.  For example, nightly jobs can be run by including test controllers that match `*-nightly.sh`, or quick running smoke tests could be executed by matching `*-smoke.sh`.  Note that file globbing is implemented by [@actions/glob](https://github.com/actions/toolkit/tree/main/packages/glob), which may behave differently than expected (if your test matrix contains unusual results, the glob expression may be why).  

> Globs matching filenames beginning with `.` are considered hidden, and will be excluded from the matrix by design.

## Typical Usage
Specify a job and a step to generate the test matrix, [saving it as an `output`](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idoutputs) of the job.  Next, define a job which `needs` the previous job, and runs the tests using the `matrix` strategy.

Here's an example with minimal boilerplate:
```yaml
jobs:
  setup-test-matrix:
    name: Generate idc-isle-dc test matrix
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.test-matrix.outputs.matrix }}
    steps:
      - name: Checkout idc-isle-dc
        uses: actions/checkout@v2
      - name: Generate Test Matrix
        id: test-matrix
        uses: emetsger/idc-matrixgen@f228f237b87c9aa46b8a361d7adc62931682e210
  run-tests:
    name: Run idc-isle-dc tests
    runs-on: ubuntu-latest
    needs: setup-test-matrix
    strategy:
      matrix: ${{ fromJSON(needs.setup-test-matrix.outputs.matrix) }}
    steps:
      - name: Checkout idc-isle-dc
        uses: actions/checkout@v2
      - name: Run ${matrix.test}
        run: make test test=${matrix.test}
```

This will produce a test matrix that includes _all_ test controllers in the `test` directory.  For example, at the time of this writing the matrix would look like:
```json
{
  "test": [
    "01-end-to-end.sh",
    "02-static-config.sh",
    "10-migration-backend-tests.sh",
    "11-file-deletion-tests.sh",
    "12-media-tests.sh",
    "13-migration-entity-resolution.sh",
    "20-export-tests.sh",
    "21-large-file-derivatives.sh",
    "21-role-permission-tests.sh"
  ]
}
```

## Exclude nightly jobs

There may be tests that are very long running, more suited to nightly execution.  They take to long to run when PRs are submitted for review and merging, so ideally the test matrix used for PRs would exclude them.  Here's an example with minimal boilerplate.  

Note that the first `step` generates the matrix, and the subsequent step amends it.  The `outputs` of the `setup-test-matrix` `job` was modified to reference the step that excluded the nightly jobs.

The `matrix` input parameter accepts an existing matrix.  In this way, `steps` can amend the matrix step-by-step, using the output of the previous step for the next step.  Be sure that the `job` references the `output` of the last `step` so that subsequent jobs will use the fully amended matrix. 

```yaml
jobs:
  setup-test-matrix:
    name: Generate idc-isle-dc test matrix
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.excludes-matrix.outputs.matrix }}
    steps:
      - name: Checkout idc-isle-dc
        uses: actions/checkout@v2
      - name: Generate Test Matrix
        id: test-matrix
        uses: emetsger/idc-matrixgen@f228f237b87c9aa46b8a361d7adc62931682e210
      - name: Exclude nightly jobs
        id: excludes-matrix
        uses: emetsger/idc-matrixgen@f228f237b87c9aa46b8a361d7adc62931682e210
        with:          
          glob: '*nightly*.sh'
          exclude: true
          matrix: ${{ steps.test-matrix.outputs.matrix }}
  run-tests:
    name: Run idc-isle-dc tests
    runs-on: ubuntu-latest
    needs: setup-test-matrix
    strategy:
      matrix: ${{ fromJSON(needs.setup-test-matrix.outputs.matrix) }}
    steps:
      - name: Checkout idc-isle-dc
        uses: actions/checkout@v2
      - name: Run ${matrix.test}
        run: make test test=${matrix.test}
```
If the `tests` directory contained a hypothetical test named `21-large-file-derivatives-nightly.sh`, the matrix used to run the tests would look like:
```json
{
  "test": [
    "01-end-to-end.sh",
    "02-static-config.sh",
    "10-migration-backend-tests.sh",
    "11-file-deletion-tests.sh",
    "12-media-tests.sh",
    "13-migration-entity-resolution.sh",
    "20-export-tests.sh",
    "21-role-permission-tests.sh"
  ],
  "exclude": [
    {
      "test": "21-large-file-derivatives-nightly.sh"
    }
  ]
}
```

## Run Nightly Jobs

To generate a test matrix of nightly jobs, simply configure this action to match tests named `*nightly*.sh`.

```yaml
jobs:
  setup-test-matrix:
    name: Generate idc-isle-dc nightly matrix
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.nightly-matrix.outputs.matrix }}
    steps:
      - name: Checkout idc-isle-dc
        uses: actions/checkout@v2
      - name: Generate Nightly Test Matrix
        id: nightly-matrix
        uses: emetsger/idc-matrixgen@f228f237b87c9aa46b8a361d7adc62931682e210
        with:          
          glob: '*nightly*.sh'
  run-tests:
    name: Run nightly idc-isle-dc tests
    runs-on: ubuntu-latest
    needs: setup-test-matrix
    strategy:
      matrix: ${{ fromJSON(needs.setup-test-matrix.outputs.matrix) }}
    steps:
      - name: Checkout idc-isle-dc
        uses: actions/checkout@v2
      - name: Run ${matrix.test}
        run: make test test=${matrix.test}
```

If the `tests` directory contained a hypothetical test named `21-large-file-derivatives-nightly.sh`, the matrix used to run the tests would look like:
```json
{
  "test": [
    "21-large-file-derivatives-nightly.sh"
  ]
}
```

## Supported Inputs and Outputs

You can always view the up-to-date list [here](./action.yml)

### Inputs

|Parameter|Required|Default Value|Description|
|---|---|---|---|
|`dir`|false|`tests/`|Directory (relative to the CWD) containing test controllers (e.g. the directory containing `01-end-to-end.sh`)|
|`glob`|false|`*.sh`|File glob matching tests to include in the matrix|
|`matrix`|false|`{}` (empty object)|Existing matrix to modify, useful when adding includes, excludes, or arbitrary matrix keys|
|`append`|false|`true`|Whether to append to, or overwrite, matching entries in the supplied matrix|
|`key`|true|`test`|The matrix key being added (e.g. arbitrary properties like `test` or `version`)|
|`include`|false|`false`|If the results should be added as an `include` to the matrix, mutually exclusive of `exclude`|
|`exclude`|false|`false`|If the results should be added as an `exclude` to the matrix, mutually exclusive of `include`|

### Outputs

|Parameter|Description|
|---|---|
|`matrix`|The resulting matrix|

## Debugging

To debug this action, add the secret `ACTIONS_STEP_DEBUG` to your repository, with a value of `true`.  Trigger the action (e.g. push a commit to a PR, or open a new PR), and debug statements should be emitted in the GH actions job log.

## Testing

Checkout this repository and run `npm run build ; npm run test`

## Releasing

Checkout this repository, develop your feature or bug fix.  Write a test.  Locally, insure everything is good by executing `npm run all`. 

This will not only run tests and a linter, but it will also generate the distribution package in `dist/`.  Commit, tag, and push the changes.

