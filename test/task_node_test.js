/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const checkTaskNode = require('../lib/task_node')

const testStateResources = {
  bar: { }
}

describe('TaskNode', () => {
  verify(
    'No Task State, so no problem',
    {
      StartAt: 'A',
      States: {
        A: {
          Type: 'Pass',
          End: true
        }
      }
    },
    0
  )

  verify(
    'Resource isn\'t a Tymly module',
    {
      StartAt: 'A',
      States: {
        A: {
          Type: 'Task',
          Resource: 'foo:bar',
          End: true
        }
      }
    },
    1
  )

  verify(
    'Resource is a Tymly module',
    {
      StartAt: 'A',
      States: {
        A: {
          Type: 'Task',
          Resource: 'module:bar',
          End: true
        }
      }
    },
    0
  )

  verify(
    'Resource URN references a Tymly module, but that module is not loaded',
    {
      StartAt: 'A',
      States: {
        A: {
          Type: 'Task',
          Resource: 'module:baz',
          End: true
        }
      }
    },
    0
  )
})

function verify (title, json, count) {
  it(title, () => {
    const problems = checkTaskNode(json, testStateResources)
    problems.forEach(p => console.log(`P: ${p}`))
    expect(problems.length).to.eql(count)
  })
} // verify
