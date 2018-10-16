const Ajv = require('ajv')

class JSONSchemaValidator {
  constructor (path) {
    const ajv = new Ajv({ schemaId: 'auto' })
    const schema = require(path)
    this.validateFn = ajv.compile(schema)
  } // constructor

  validate (json) {
    const valid = this.validateFn(json)

    if (valid) return []

    return valid ? [] : this.validateFn.errors.map(e => `${e.dataPath} ${e.message}`)
  } // validate
} // JSONSchemaValidator

module.exports = path => new JSONSchemaValidator(path)
