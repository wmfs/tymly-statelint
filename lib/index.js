const StateLint = require('@wmfs/statelint').StateLint

const extensionPath = require.resolve('./schema/TymlyExtension.j2119')

class TymlyStateLint extends StateLint {
  constructor () {
    super(extensionPath)
  } // constructor

} // TymlyStateLint

module.exports = () => new TymlyStateLint()