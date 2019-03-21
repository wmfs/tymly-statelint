/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const fs = require('fs')
const path = require('path')

const tymlyStateLint = require('../lib')

const fixturesDir = path.dirname(require.resolve('./fixtures'))

function tests (stateResources) {
  describe(`${stateResources ? 'With' : 'without'} state resource validation`, () => {
    const nullLogger = {
      warn: () => {},
      error: () => {}
    }

    const fixtures = [
      ['timestamp.json', 0],
      ['hmo.json', 2],
      ['building-dna.json', 11]
    ]

    for (const [file, errors] of fixtures) {
      it(file, () => {
        const linter = tymlyStateLint(stateResources, nullLogger)
        const json = require(path.join(fixturesDir, file))
        const problems = linter.validate(json)

        problems.forEach(p => console.log(`P: ${p}`))

        expect(problems.length).to.eql(stateResources ? errors : 0)
      })
    }
  })
}

const stateResources = {
  runFunction: { rootDirPath: path.resolve(__dirname, './fixtures/run-function/') },
  findingById: { rootDirPath: '.' },
  setContextData: { rootDirPath: '.' },
  awaitingHumanInput: { rootDirPath: '.' },
  upserting: { rootDirPath: '.' },
  refreshRanking: { rootDirPath: '.' },
  deltaReindex: { rootDirPath: '.' },
  timestamp: { rootDirPath: '.' }
}

describe('TymlyStateMachineLint', () => {
  tests(null)
  tests(stateResources)
  describe('logger', () => {
    class TestLogger {
      constructor () { this.msgs_ = [] }
      get logs () { return this.msgs_ }
      warn (m) { this.msgs_.push(m) }
      error (m) { this.msgs_.push(m) }
    }

    it('warning when no state resources available', () => {
      const logger = new TestLogger()
      tymlyStateLint(null, null, logger)

      expect(logger.logs).to.eql(['State Resources not available. Will not validate Resource, ResourceConfig or Parameters'])
    })
  })
})
