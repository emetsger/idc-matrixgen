import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as path from 'path'
import {Globber} from '@actions/glob'

const INCLUDE = 'include'
const EXCLUDE = 'exclude'

/**
 * Encapsulates arrays or objects that ar indexed by string keys.  The
 * semantics of Matrix are documented here:
 * https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstrategymatrix
 *
 * The Matrix is used directly by GitHub Actions 'matrix' strategy, as e.g.:
 *   run-tests:
 *     name: Run nightly idc-isle-dc tests
 *     runs-on: ubuntu-latest
 *     needs: setup-test-matrix
 *     strategy:
 *     matrix: ${{ fromJSON(needs.setup-test-matrix.outputs.matrix) }}
 *     steps:
 *      - name: Checkout idc-isle-dc
 *        uses: actions/checkout@v2
 *      - name: Run ${matrix.test}
 *        run: make test test=${matrix.test}
 *
 * Where the value of the 'matrix' parameter is an instance of this interface.
 */
export interface Matrix {
  [index: string]: string[] | object[]
}

async function run(): Promise<void> {
  try {
    let dir: string = core.getInput('dir')
    if (!dir.endsWith('/')) {
      dir = `${dir}/`
    }

    const fileGlob: string = core.getInput('glob')

    let matrix: Matrix = JSON.parse('{}')

    if (core.getInput('matrix').length > 0) {
      const strMatrix = core.getInput('matrix')
      matrix = JSON.parse(`${strMatrix}`)
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

    const globber = await glob.create(`${dir}${fileGlob}`, {})
    const files: string[] = []

    await filterFiles(globber, files)

    matrix = apply(matrix, files, key, include, exclude, append)

    core.debug(`Output matrix: ${matrix}`)
    core.setOutput('matrix', matrix)
  } catch (error) {
    core.setFailed(error.message)
  }
}

/**
 * Populates the supplied files array using the Globber.
 *
 * For each file supplied by Globber: take the basename of the file.  If
 * the basename begins with a '.', skip the file.  Otherwise, add the basename
 * to the supplied files array.
 *
 * @param globber a configured Globber ready to be invoked
 * @param files an empty array of string, to be populated by base filenames obtained from the Globber
 */
export async function filterFiles(
  globber: Globber,
  files: string[]
): Promise<void> {
  for await (const file of globber.globGenerator()) {
    const basename = path.basename(file)
    if (basename.startsWith('.')) {
      core.debug(`Ignoring hidden file ${file}`)
    } else {
      core.debug(`Got file ${file}, added as ${basename}`)
      files.push(basename)
    }
  }
}

/**
 * Adds the supplied files to the given Matrix indexed by the supplied key.
 *
 * In the simplest case, include and exclude are false, and append is true.  The
 * supplied Matrix is an empty object.
 *
 * In this simplest case, if the supplied files array contains a single file,
 * 'moo.sh' and the supplied 'key' is 'test', then this function will return
 * an object with a single key 'test', with an array containing a single
 * element, a string value 'foo.sh':
 * {
 *   "test": [ "foo.sh" ]
 * }
 *
 * If the supplied files array contains multiple elements, they will all be
 * keyed by the supplied key:
 * {
 *   "test": [ "foo.sh", "bar.sh", "baz.sh" ]
 * }
 *
 * If 'include' is true, the supplied Matrix will have the 'include' key added,
 * which keys an array of objects using the supplied 'key' and files.  In the
 * following example, the supplied matrix is the empty object, 'include' is
 * true, and the 'key' is "test",
 * e.g.:
 * {
 *   "include": [
 *     { "test": "include-me.sh" },
 *     { "test": "and-also-me.sh" }
 *   ]
 * }
 *
 * Similarly, if 'exclude' is true, the supplied Matrix will have the 'exclude'
 * key added; behaving just like 'include', except using 'exclude':
 * {
 *   "exclude": [
 *     { "test": "exclude-me.sh" },
 *     { "test": "and-also-me.sh" }
 *   ]
 * }
 *
 * Multiple calls to `apply(...)` augments the supplied Matrix.  For example,
 * an initial call to apply with a 'key' equal to 'test' and an array of files
 * results in:
 * {
 *   "test": [ "smoke-test.sh", "super-long-test.sh" ]
 * }
 * Using the resulting Matrix in a subsequent call to apply, setting 'exclude'
 * to true with another array of files will result in an additional key,
 * 'exclude' being added:
 * {
 *   "test": [ "smoke-test.sh", "super-long-test.sh" ],
 *   "exclude": [
 *     { "test": "super-long-test.sh" }
 *   ]
 * }
 *
 * Therefore, `apply(...)` can be invoked multiple times to augment a Matrix
 * that is ultimately used by the GitHub 'matrix' strategy to select tests and
 * execute them in parallel.
 *
 * @param matrix the Matrix which must be an object, but may be empty (i.e. no keys)
 * @param files an array of file names (base names, not absolute paths) representing tests to be executed by a test matrix
 * @param key the matrix key
 * @param include if true, adds the files as an array of objects under the special key 'include'
 * @param exclude if true, adds the files as an array of objects under the special key 'exclude'
 * @param append if true, appends the files to an existing array, otherwise overwrites the array
 */
export function apply(
  matrix: Matrix,
  files: string[],
  key: string,
  include: boolean,
  exclude: boolean,
  append: boolean
): Matrix {
  if (include && exclude) {
    throw new Error(
      '"include" and "exclude" are mutually exclusive, only one may be true'
    )
  }

  if (include || exclude) {
    let param: string
    if (include) {
      param = INCLUDE
    } else {
      param = EXCLUDE
    }

    core.debug(`Got ${param} with key: ${key}`)

    let arr: object[] = []
    if (param in matrix && append) {
      // get the exising array and append to it
      arr = matrix[param] as object[]
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

    let arr: string[] = []
    if (key in matrix && append) {
      // get the exising array and append to it
      arr = matrix[key] as string[]
    } else if (key in matrix && !append) {
      // overwrite the existing array
      matrix[key] = arr
    } else {
      // key is not in the matrix, use the empty array
      matrix[key] = arr
    }
    arr.push(...files)
  }
  return matrix
}

run()
