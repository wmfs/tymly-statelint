const StateLint = require('@wmfs/statelint').StateLint
const extensionPath = require.resolve('./schema/TymlyExtension.j2119')
const checkTaskNodes = require('./task_node')

class TymlyStateLint extends StateLint {
  constructor () {
    super(extensionPath)
  } // constructor

  validate (json) {
    const problems = super.validate(json)

    return checkTaskNodes(json, problems)
  } // validate
} // TymlyStateLint

module.exports = () => new TymlyStateLint()
