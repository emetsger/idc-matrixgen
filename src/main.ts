import * as core from '@actions/core'
import * as glob from '@actions/glob'

async function run(): Promise<void> {
  try {
    let testdir: string = core.getInput('testdir')
    if (!testdir.endsWith('/')) {
      testdir = `${testdir}/`
    }

    const testglob: string = core.getInput('glob')
    core.debug(`testdir is ${testdir}`) // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    core.debug(`glob is ${testglob}`)

    const globber = await glob.create(`${testdir}${testglob}`)
    const files = await globber.glob()

    for (const file of files) {
      core.debug(`Got file: ${file}`)
    }

    core.setOutput('files', files)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
