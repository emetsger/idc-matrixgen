import * as core from '@actions/core'
import * as glob from '@actions/glob'

const INCLUDE_KEY = 'include'
const EXCLUDE_KEY = 'exclude'

async function run(): Promise<void> {
  try {
    let dir: string = core.getInput('dir')
    if (!dir.endsWith('/')) {
      dir = `${dir}/`
    }

    const fileGlob: string = core.getInput('glob')

    let matrix = JSON.parse('{}')
    let matrixtype: string = typeof matrix
    core.debug(`1. Typeof matrix: ${matrixtype}`)

    if (core.getInput('matrix').length > 0) {
      const strMatrix = core.getInput('matrix')
      core.debug(`using ${strMatrix} as a literal?`)
      matrix = JSON.parse(`${strMatrix}`)
      matrixtype = typeof matrix
      core.debug(`2. Typeof matrix: ${matrixtype}`)
    }

    const append: boolean = core.getBooleanInput('append')

    const key: string = core.getInput('key')

    core.debug(`dir is ${dir}`)
    core.debug(`glob is ${fileGlob}`)
    core.debug(`matrix is ${matrix}`)
    core.debug(`append is ${append}`)
    core.debug(`key is ${key}`)

    const globber = await glob.create(`${dir}${fileGlob}`)
    const files = await globber.glob()

    for (const file of files) {
      core.debug(`Got file: ${file}`)
    }

    switch (key) {
      case INCLUDE_KEY:
      case EXCLUDE_KEY: {
        core.debug(`Got include or exclude key: ${key}`)
        matrixtype = typeof matrix
        core.debug(`3. Typeof matrix: ${matrixtype}`)

        let arr: object[] = []
        if (key in matrix && append) {
          // get the exising array and append to it
          arr = matrix[key]
        } else if (key in matrix && !append) {
          // overwrite the existing array
          matrix[key] = arr
        } else {
          // key is not in the matrix, use the empty array
          matrix[key] = arr
        }
        for (const file of files) {
          const obj = JSON.parse('{}')
          obj[key] = file
          arr.push(obj)
        }
        break
      }
      default: {
        core.debug(`Got key: ${key}`)
        matrixtype = typeof matrix
        core.debug(`4. Typeof matrix: ${matrixtype}`)

        let arr: string[] = []
        if (key in matrix && append) {
          // get the exising array and append to it
          arr = matrix[key]
        } else if (key in matrix && !append) {
          // overwrite the existing array
          matrix[key] = arr
        } else {
          // key is not in the matrix, use the empty array
          matrix[key] = arr
        }
        arr.push(...files)
        break
      }
    }

    core.debug(`Output matrix: ${matrix}`)
    core.setOutput('matrix', matrix)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
