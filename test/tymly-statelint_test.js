/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const fs = require('fs')
const path = require('path')

const tymlyStateLint = require('../lib')

describe('TymlyStateMachineLint', () => {
  const linter = tymlyStateLint()

  const fixturesDir = path.dirname(require.resolve('./fixtures'))

  for (const file of fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'))) {
    it(file, () => {
      const json = require(path.join(fixturesDir, file))
      const problems = linter.validate(json)

      problems.forEach(p => console.log(`P: ${p}`))

      expect(problems).to.eql([])
    })
  }
})
