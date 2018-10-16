const path = require('path')
const fs = require('fs')
const j2119Validator = require('@wmfs/j2119')
const jsonSchemaValidator = require('./json_schema_loader')

const moduleRegex = /^module:(.+)$/

const schemaTypes = {
  j2119: j2119Validator,
  json: jsonSchemaValidator
}

class CheckTaskNodes {
  constructor (stateResources, logger = console) {
    this.resources = stateResources
    this.validators = { }
    this.logger = logger

    if (!this.resources) {
      this.logger.warn('State Resources not available. Will not validate Resource or ResourceConfig')
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

    const validator = loadValidator(resourceName, this.resources[resourceName].rootDirPath, this.logger)
    this.validators[resourceName] = validator
    return validator
  } // findValidator
} // CheckTaskNodes

const nullValidator = {
  validate: () => []
} // nullValidator

function loadValidator (resourceName, rootDir, logger) {
  for (const [schemaType, validatorLoader] of Object.entries(schemaTypes)) {
    const schemaFile = path.resolve(rootDir, `schema.${schemaType}`)
    if (fs.existsSync(schemaFile)) {
      try {
        return validatorLoader(schemaFile)
      } catch (err) {
        logger.error(`Couldn't load ResourceConfig schema for ${resourceName}:\n  ${err.message}`)
        return nullValidator
      }
    } // if ...
  } // for ...

  logger.warn(`No ResourceConfig schema available for ${resourceName}`)
  return nullValidator
} // loadValidator

function isObject (o) {
  return o && (typeof o === 'object')
} // isObject

module.exports = (stateResources, logger) => new CheckTaskNodes(stateResources, logger)
