import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as path from 'path'

const INCLUDE = 'include'
const EXCLUDE = 'exclude'

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

    const include: boolean = core.getBooleanInput('include')
    const exclude: boolean = core.getBooleanInput('exclude')

    if (include && exclude) {
      throw new Error(
        '"include" and "exclude" are mutually exclusive, only one may be true'
      )
    }

    core.debug(`dir is ${dir}`)
    core.debug(`glob is ${fileGlob}`)
    core.debug(`matrix is ${matrix}`)
    core.debug(`append is ${append}`)
    core.debug(`key is ${key}`)
    core.debug(`exclude is ${exclude}`)
    core.debug(`include is ${include}`)

    const globber = await glob.create(`${dir}${fileGlob}`)
    const files = await globber.glob()

    // eslint-disable-next-line github/array-foreach
    files.forEach((v, i, arr) => {
      arr[i] = path.basename(v)
      core.debug(`Got file ${v}, added as ${arr[i]}`)
    })

    if (include || exclude) {
      let param = ''
      if (include) {
        param = INCLUDE
      } else {
        param = EXCLUDE
      }

      core.debug(`Got ${param} with key: ${key}`)
      matrixtype = typeof matrix
      core.debug(`3. Typeof matrix: ${matrixtype}`)

      let arr: object[] = []
      if (param in matrix && append) {
        // get the exising array and append to it
        arr = matrix[param]
      } else if (param in matrix && !append) {
        // overwrite the existing array
        matrix[param] = arr
      } else {
        // key is not in the matrix, use the empty array
        matrix[param] = arr
      }
      for (const file of files) {
        const obj = JSON.parse('{}')
        obj[key] = file
        arr.push(obj)
      }
    } else {
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
    }

    core.debug(`Output matrix: ${matrix}`)
    core.setOutput('matrix', matrix)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
