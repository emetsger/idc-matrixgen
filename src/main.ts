import * as core from '@actions/core'
import * as glob from '@actions/glob'

const INCLUDE_KEY: string = "include"
const EXCLUDE_KEY: string = "exclude"

async function run(): Promise<void> {
  try {

    let dir: string = core.getInput('dir')
    if (!dir.endsWith('/')) {
      dir = `${dir}/`
    }

    const fileGlob: string = core.getInput('glob')

    let matrix = JSON.parse('{}')
    const strMatrix = core.getInput('matrix');

    if (strMatrix.trim() !== "") {
      matrix = JSON.parse(strMatrix)
    }

    const append: boolean = core.getBooleanInput('append')

    const key: string = core.getInput('key')

    core.debug(`dir is ${dir}`);
    core.debug(`glob is ${fileGlob}`)
    core.debug(`matrix is ${matrix}`)
    core.debug(`append is ${append}`)
    core.debug(`key is ${key}`)

    const globber = await glob.create(`${dir}${fileGlob}`)
    const files = await globber.glob()

    for (const file of files) {
      core.debug(`Got file: ${file}`)
    }

    let arr: string[] = [""]

    switch (key) {
      case INCLUDE_KEY:
      case EXCLUDE_KEY: {
        if ((key in matrix) && append) {
          // append to the existing array

        } else if ((key in matrix) && !append) {

        } else {

        }
        break
      }  
      default: {
        {
          let arr: string[] = [""]
          if ((key in matrix) && append) {
            // get the exising array and append to it
            arr = matrix[key]
          } else if ((key in matrix) && !append) {
            // overwrite the existing array
            matrix[key] = arr
          } else {
            // key is not in the matrix, use the empty array
            matrix[key] = arr
          }
        }
        arr.push(...files)
        break
      }
    }
    
    core.debug(`Output matrix: ${matrix}`)
    core.setOutput("matrix", matrix)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
