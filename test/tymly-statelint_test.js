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

    for (const file of fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'))) {
      it(file, () => {
        const linter = tymlyStateLint(stateResources, nullLogger)
        const json = require(path.join(fixturesDir, file))
        const problems = linter.validate(json)

        problems.forEach(p => console.log(`P: ${p}`))

        expect(problems).to.eql([])
      })
    }
  })
}

const stateResources = {
  runFunction: { rootDirPath: '.' },
  findingById: { rootDirPath: '.' },
  setContextData: { rootDirPath: '.' },
  awaitingHumanInput: { rootDirPath: '.' },
  upserting: { rootDirPath: '.' },
  refreshRanking: { rootDirPath: '.' },
  deltaReindex: { rootDirPath: '.' },
  timestamp: { rootDirPath: '.' }
}

describe('TymlyStateMachineLint', () => {
  tests()
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

      expect(logger.logs).to.eql(['State Resources not available. Will not validate Resource or ResourceConfig'])
    })

    it('warning when no state resource schema available', () => {
      const logger = new TestLogger()
      const linter = tymlyStateLint(stateResources, null, logger)
      linter.validate(require(path.join(fixturesDir, 'timestamp.json')))

      expect(logger.logs).to.eql(['No ResourceConfig schema available for timestamp'])
    })
  })
})
