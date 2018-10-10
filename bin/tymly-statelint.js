#! /usr/bin/env node
const cli = require('@wmfs/statelint').cli
const tymlyStateLint = require('../lib')

const driver = cli(
  tymlyStateLint(),
  'Validates Amazon State Language with Tymly Extension files'
)
const ok = driver.process()
process.exit(ok ? 0 : 1)
