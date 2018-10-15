/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const checkTaskNode = require('../lib/task_node')

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
})

function verify (title, json, count) {
  it(title, () => {
    const problems = checkTaskNode(json)
    expect(problems.length).to.eql(count)
  })
} // verify
