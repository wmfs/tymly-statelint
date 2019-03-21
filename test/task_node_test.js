/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const path = require('path')

const CheckTaskNode = require('../lib/task_node')
const testStateResources = {
  bar: {
    rootDirPath: '.'
  },
  RunFunction: {
    rootDirPath: path.resolve(__dirname, './fixtures/run-function/')
  },
  RCFunction: {
    rootDirPath: path.resolve(__dirname, './fixtures/run-function-with-resource-config/')
  },
  ParamFunction: {
    rootDirPath: path.resolve(__dirname, './fixtures/run-function-with-parameters/')
  },
  CallFunction: {
    rootDirPath: path.resolve(__dirname, './fixtures/call-function/')
  }
}
const testFunctions = {
  fn: true
}

describe('TaskNode', () => {
  describe('Task Resource validation', () => {
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
      'Resource is a Tymly function',
      {
        StartAt: 'A',
        States: {
          A: {
            Type: 'Task',
            Resource: 'function:fn',
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
      1
    )

    verify(
      'Resource is a Tymly function, but the function does not exist',
      {
        StartAt: 'A',
        States: {
          A: {
            Type: 'Task',
            Resource: 'function:unknownfn',
            End: true
          }
        }
      },
      1
    )
  })

  describe('Task ResourceConfig validation with resource-config-schema.j2119', () => {
    const machine = {
      StartAt: 'A',
      States: {
        A: {
          Type: 'Task',
          Resource: 'module:RCFunction',
          End: true
        }
      }
    }

    verify(
      'ResourceConfig is missing',
      machine,
      1
    )

    machine.States.A['ResourceConfig'] = {
      'function': 'getFruitName',
      'parameter': 'chirimoya'
    }
    verify(
      'ResourceConfig has incorrect fields',
      machine,
      3
    )

    machine.States.A['ResourceConfig'] = {
      functionName: 100
    }
    verify(
      'ResourceConfig is has incorrect type',
      machine,
      1
    )

    machine.States.A['ResourceConfig'] = {
      functionName: 'isBanana',
      debug: true
    }
    verify(
      'ResourceConfig is has additional field',
      machine,
      1
    )

    machine.States.A['ResourceConfig'] = {
      functionName: 'isBanana'
    }
    verify(
      'ResourceConfig validates',
      machine,
      0
    )
  })

  describe('Task Parameters validation with parameters-schema.j2119', () => {
    const machine = {
      StartAt: 'A',
      States: {
        A: {
          Type: 'Task',
          Resource: 'module:ParamFunction',
          End: true
        }
      }
    }

    verify(
      'Parameters is missing',
      machine,
      1
    )

    machine.States.A['Parameters'] = {
      'function': 'getFruitName',
      'parameter': 'chirimoya'
    }
    verify(
      'Parameters has incorrect fields',
      machine,
      3
    )

    machine.States.A['Parameters'] = {
      functionName: 100
    }
    verify(
      'Parameters is has incorrect type',
      machine,
      1
    )

    machine.States.A['Parameters'] = {
      functionName: 'isBanana',
      debug: true
    }
    verify(
      'Parameters is has additional field',
      machine,
      1
    )

    machine.States.A['Parameters'] = {
      functionName: 'isBanana'
    }
    verify(
      'Parameters validates',
      machine,
      0
    )

    machine.States.A['Parameters'] = {
      'functionName.$': '$.isBanana'
    }
    verify(
      'Parameters validates when extracting values',
      machine,
      0
    )

    machine.States.A['Parameters'] = {
      'functionName.$': 'Wango'
    }
    verify(
      'Parameters extract value must be a Path ',
      machine,
      1
    )
  })

  describe('Task ResourceConfig validation with JSON schema validator', () => {
    const machine = {
      StartAt: 'A',
      States: {
        A: {
          Type: 'Task',
          Resource: 'module:CallFunction',
          End: true
        }
      }
    }

    verify(
      'ResourceConfig is missing',
      machine,
      0
    )

    machine.States.A['ResourceConfig'] = {
      'function': 'getFruitName',
      'parameter': 'chirimoya'
    }
    verify(
      'ResourceConfig has incorrect fields',
      machine,
      1
    )

    machine.States.A['ResourceConfig'] = {
      functionName: 100
    }
    verify(
      'ResourceConfig is has incorrect type',
      machine,
      1
    )

    machine.States.A['ResourceConfig'] = {
      functionName: 'isBanana',
      debug: true
    }
    verify(
      'ResourceConfig is has additional field',
      machine,
      1
    )

    machine.States.A['ResourceConfig'] = {
      functionName: 'isBanana'
    }
    verify(
      'ResourceConfig validates',
      machine,
      0
    )
  })

  describe('Task ResourceConfig & Parameter validation with schema.j2119', () => {
    const machine = {
      StartAt: 'A',
      States: {
        A: {
          Type: 'Task',
          Resource: 'module:RunFunction',
          End: true
        }
      }
    }

    verify(
      'Both ResourceConfig and Parameters are missing',
      machine,
      0
    )

    describe('ResourceConfig present so will be validated', () => {
      machine.States.A['ResourceConfig'] = {
        'function': 'getFruitName',
        'parameter': 'chirimoya'
      }
      verify(
        'ResourceConfig has incorrect fields',
        machine,
        3
      )

      machine.States.A['ResourceConfig'] = {
        functionName: 100
      }
      verify(
        'ResourceConfig is has incorrect type',
        machine,
        1
      )

      machine.States.A['ResourceConfig'] = {
        functionName: 'isBanana',
        debug: true
      }
      verify(
        'ResourceConfig is has additional field',
        machine,
        1
      )

      machine.States.A['ResourceConfig'] = {
        functionName: 'isBanana'
      }
      verify(
        'ResourceConfig validates',
        machine,
        0
      )

      delete machine.States.A['ResourceConfig']
    })

    describe('No ResourceConfig, Parameters present so validate those', () => {
      machine.States.A['Parameters'] = {
        'function': 'getFruitName',
        'parameter': 'chirimoya'
      }
      verify(
        'Parameters has incorrect fields',
        machine,
        3
      )

      machine.States.A['Parameters'] = {
        functionName: 100
      }
      verify(
        'Parameters is has incorrect type',
        machine,
        1
      )

      machine.States.A['Parameters'] = {
        functionName: 'isBanana',
        debug: true
      }
      verify(
        'Parameters is has additional field',
        machine,
        1
      )

      machine.States.A['Parameters'] = {
        functionName: 'isBanana'
      }
      verify(
        'Parameters validates',
        machine,
        0
      )
    })

    describe('Both ResourceConfig and Parameters present. Validate ResourceConfig error on Parameters', () => {
      machine.States.A['ResourceConfig'] = {
        'function': 'getFruitName',
        'parameter': 'chirimoya'
      }
      verify(
        'ResourceConfig has incorrect fields',
        machine,
        4
      )

      machine.States.A['ResourceConfig'] = {
        functionName: 100
      }
      verify(
        'ResourceConfig is has incorrect type',
        machine,
        2
      )

      machine.States.A['ResourceConfig'] = {
        functionName: 'isBanana',
        debug: true
      }
      verify(
        'ResourceConfig is has additional field',
        machine,
        2
      )

      machine.States.A['ResourceConfig'] = {
        functionName: 'isBanana'
      }
      verify(
        'ResourceConfig validates',
        machine,
        1
      )
    })
  })
})

const nullLogger = {
  warn: () => {},
  error: () => {}
}

function verify (title, src, count) {
  const json = JSON.parse(JSON.stringify(src))
  it(title, () => {
    const taskNodeChecker = CheckTaskNode(testStateResources, testFunctions, nullLogger)
    const problems = taskNodeChecker.check(json)
    problems.forEach(p => console.log(`P: ${p}`))
    expect(problems.length).to.eql(count)
  })
} // verify
