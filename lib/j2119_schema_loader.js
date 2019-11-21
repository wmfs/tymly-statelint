const j2119Validator = require('@wmfs/j2119')

const AllowAnyValidator = {
  validate () {
    return []
  }
}

function j2119SubobjectValidator (path) {
  const validator = j2119Validator(path)

  // We've loaded a validator for a ResourceConfig or Parameters,
  // but it specifies no validation rules. Normally this would mean
  // no fields are valid, but in these cases we'll allow anything.
  const f = validator.parser.allowedFields
  if ((f.allowed.size === 0) && (f.any.length === 0)) {
    return AllowAnyValidator
  }

  return validator
}

module.exports = j2119SubobjectValidator
