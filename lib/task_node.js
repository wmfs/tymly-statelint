const path = require('path')
const fs = require('fs')
const j2119Validator = require('@wmfs/j2119')
const Ajv = require('ajv')

const moduleRegex = /^module:(.+)$/

const schemaTypes = {
  j2119: path => j2119Validator(path),
  json: path => jsonSchemaValidator(path)
}

class CheckTaskNodes {
  constructor (stateResources) {
    this.resources = stateResources
    this.validators = { }

    if (!this.resources) {
      console.warn('State Resources not available. Will not validate Resource or ResourceConfig')
    }
  } // constructor

  check (json, problems = []) {
    this.problems = problems

    this.checkTaskNodes(json)

    return this.problems
  } // check

  checkTaskNodes (json) {
    if (!isObject(json)) return

    this.checkStates(json.States)
  } // checkTaskNode

  checkStates (states) {
    if (!isObject(states)) return

    for (const [name, state] of Object.entries(states)) {
      this.checkTask(name, state)
    }
  } // checkStates

  checkTask (name, state) {
    if (state.Type !== 'Task') return

    const resource = moduleRegex.exec(state.Resource)
    if (!resource) {
      return this.problems.push(`State Machine.States.${name}.Resource '${state.Resource}' does not reference a Tymly module`)
    }

    this.checkResource(name, state, resource[1])
  } // checkTask

  checkResource (name, state, resourceName) {
    if (!this.resources) return

    if (!this.resources[resourceName]) {
      return this.problems.push(`State Machine.States.${name}.Resource references a module '${resourceName}' which is not loaded.`)
    }

    this.checkResourceConfig(name, resourceName, state.ResourceConfig)
  } // checkResource

  checkResourceConfig (name, resourceName, resourceConfig) {
    const validator = this.findValidator(resourceName)

    const problems = validator.validate(resourceConfig)
    problems.forEach(p =>
      this.problems.push(`State Machine.States.${name}.ResourceConfig ${p}`)
    )
  } // checkResourceConfig

  findValidator (resourceName) {
    if (this.validators[resourceName]) {
      return this.validators[resourceName]
    }

    const validator = loadValidator(resourceName, this.resources[resourceName].rootDirPath)
    this.validators[resourceName] = validator
    return validator
  } // findValidator
} // CheckTaskNodes

const nullValidator = {
  validate: () => []
} // nullValidator

function loadValidator (resourceName, rootDir) {
  try {
    for (const [schemaType, validatorLoader] of Object.entries(schemaTypes)) {
      const schemaFile = path.resolve(rootDir, `schema.${schemaType}`)
      if (fs.existsSync(schemaFile)) {
        return validatorLoader(schemaFile)
      } // if ...
    } // for ...
  } catch (err) {
    console.error(`Couldn't load ResourceConfig schema for ${resourceName}:\n  ${err.message}`)
    return nullValidator
  }
  console.warn(`No ResourceConfig schema available for ${resourceName}`)
  return nullValidator
} // loadValidator

function isObject (o) {
  return o && (typeof o === 'object')
} // isObject

function jsonSchemaValidator (path) {
  const ajv = new Ajv({ schemaId: 'auto' })
  const schema = require(path)
  const validateFn = ajv.compile(schema)
  return {
    validate: json => {
      const validate = validateFn(json)

      if (validate) return []

      return validateFn.errors.map(e => `${e.dataPath} ${e.message}`)
    }
  }
}

module.exports = stateResources => new CheckTaskNodes(stateResources)
