import {wait} from '../src/wait'
import {apply, filterFiles} from '../src/main'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'
import * as glob from '@actions/glob'

test('throws invalid number', async () => {
  const input = parseInt('foo', 10)
  await expect(wait(input)).rejects.toThrow('milliseconds not a number')
})

test('wait 500 ms', async () => {
  const start = new Date()
  await wait(500)
  const end = new Date()
  var delta = Math.abs(end.getTime() - start.getTime())
  expect(delta).toBeGreaterThan(450)
})

test('list tests', async () => {
  // TODO
})

// shows how the runner will run a javascript action with env / stdout protocol
// test('test runs', () => {
//   process.env['INPUT_MILLISECONDS'] = '500'
//   const np = process.execPath
//   const ip = path.join(__dirname, '..', 'lib', 'main.js')
//   const options: cp.ExecFileSyncOptions = {
//     env: process.env
//   }
//   console.log(cp.execFileSync(np, [ip], options).toString())
// })

test('test defaults', () => {
  // defaults
  process.env['INPUT_APPEND'] = 'true'
  process.env['INPUT_KEY'] = 'test'
  process.env['INPUT_INCLUDE'] = 'false'
  process.env['INPUT_EXCLUDE'] = 'false'

  process.env['INPUT_DIR'] = path.join(__dirname, 'testdir')
  process.env['INPUT_GLOB'] = '*.sh'

  const np = process.execPath
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecFileSyncOptions = {
    env: process.env
  }

  console.log(cp.execFileSync(np, [ip], options).toString())
})

test('test apply', () => {
  const initialMatrix = JSON.parse('{}')
  const result = apply(
    initialMatrix,
    ['file1', 'file2'],
    'test',
    false,
    false,
    true
  )
  expect(Object.keys(result).length).toEqual(1)
  expect('test' in result).toEqual(true)
  expect(result['test']).toEqual(['file1', 'file2'])
})

test('test include', () => {
  const initialMatrix = JSON.parse('{}')
  const result = apply(
    initialMatrix,
    ['file1', 'file2'],
    'test',
    true,
    false,
    true
  )
  expect(Object.keys(result).length).toEqual(1)
  expect('include' in result).toEqual(true)
  expect(result['include']).toEqual([{test: 'file1'}, {test: 'file2'}])
})

test('test exclude', () => {
  const initialMatrix = JSON.parse('{}')
  const result = apply(
    initialMatrix,
    ['file1', 'file2'],
    'test',
    false,
    true,
    true
  )
  expect(Object.keys(result).length).toEqual(1)
  expect('exclude' in result).toEqual(true)
  expect(result['exclude']).toEqual([{test: 'file1'}, {test: 'file2'}])
})

test('apply then exclude', () => {
  const initialMatrix = JSON.parse('{}')

  let result = apply(
    initialMatrix,
    ['file1', 'file2'],
    'test',
    false,
    false,
    true
  )
  result = apply(result, ['file1'], 'test', false, true, true)
  expect(Object.keys(result).length).toEqual(2)
  expect('test' in result).toEqual(true)
  expect(result['test']).toEqual(['file1', 'file2'])
  expect('exclude' in result).toEqual(true)
  expect(result['exclude']).toEqual([{test: 'file1'}])
})

test('glob hidden files', async () => {
  const dir = path.join(__dirname, 'testdir/')
  const globpattern = '*.sh'

  // make sure that the globber "sees" a hidden file.
  let globber = await glob.create(`${dir}${globpattern}`)
  const result = await globber.glob()
  const bareGlobberFiles = []
  let hiddenFound = false
  for (const f of result) {
    if ('.hidden.sh' === path.basename(f)) {
      hiddenFound = true
    } else {
      bareGlobberFiles.push(path.basename(f))
    }
  }
  expect(hiddenFound).toEqual(true)

  // now, invoke filterFiles(...) and demonstrate that the results are the same
  // as the bare globber minus the hidden file.
  hiddenFound = false
  const files: string[] = []
  await filterFiles(await glob.create(`${dir}${globpattern}`), files)

  for (const f of files) {
    if ('.hidden.sh' === path.basename(f)) {
      hiddenFound = true
    }
  }

  expect(hiddenFound).toEqual(false)
  expect(files).toEqual(bareGlobberFiles)
})
