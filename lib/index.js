const StateLint = require('@wmfs/statelint').StateLint
const extensionPath = require.resolve('./schema/TymlyExtension.j2119')
const CheckTaskNodes = require('./task_node')

class TymlyStateLint extends StateLint {
  constructor (stateResources, logger) {
    super(extensionPath)
    this.taskNodeChecker = CheckTaskNodes(stateResources, logger)
  } // constructor

  validate (json) {
    const problems = super.validate(json)

    return this.taskNodeChecker.check(json, problems)
  } // validate
} // TymlyStateLint

module.exports = (stateResources, logger) => new TymlyStateLint(stateResources, logger)
