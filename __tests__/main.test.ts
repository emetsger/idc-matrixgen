import {wait} from '../src/wait'
import {apply} from '../src/main'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'

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
  const result = apply(false, false, 'test', initialMatrix, true, [
    'file1',
    'file2'
  ])
  expect(Object.keys(result).length).toEqual(1)
  expect('test' in result).toEqual(true)
  expect(result['test']).toEqual(['file1', 'file2'])
})

test('test include', () => {
  const initialMatrix = JSON.parse('{}')
  const result = apply(true, false, 'test', initialMatrix, true, [
    'file1',
    'file2'
  ])
  expect(Object.keys(result).length).toEqual(1)
  expect('include' in result).toEqual(true)
  expect(result['include']).toEqual([{test: 'file1'}, {test: 'file2'}])
})

test('test exclude', () => {
  const initialMatrix = JSON.parse('{}')
  const result = apply(false, true, 'test', initialMatrix, true, [
    'file1',
    'file2'
  ])
  expect(Object.keys(result).length).toEqual(1)
  expect('exclude' in result).toEqual(true)
  expect(result['exclude']).toEqual([{test: 'file1'}, {test: 'file2'}])
})

test('apply then exclude', () => {
  const initialMatrix = JSON.parse('{}')

  let result = apply(false, false, 'test', initialMatrix, true, [
    'file1',
    'file2'
  ])
  result = apply(false, true, 'test', result, true, ['file1'])
  expect(Object.keys(result).length).toEqual(2)
  expect('test' in result).toEqual(true)
  expect(result['test']).toEqual(['file1', 'file2'])
  expect('exclude' in result).toEqual(true)
  expect(result['exclude']).toEqual([{test: 'file1'}])
})
