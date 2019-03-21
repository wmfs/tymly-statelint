const path = require('path')
const fs = require('fs')
const j2119Validator = require('@wmfs/j2119')
const jsonSchemaValidator = require('./json_schema_loader')
const kebabCase = require('lodash.kebabcase')

const moduleRegex = /^(module|function):(.+)$/

const schemaTypes = {
  j2119: j2119Validator,
  json: jsonSchemaValidator
}

class CheckTaskNodes {
  constructor (stateResources, functions, logger = console) {
    this.resources = stateResources
    this.functions = functions
    this.validators = {
      'ResourceConfig': { },
      'Parameters': { }
    }
    this.logger = logger

    if (!this.resources) {
      this.logger.warn('State Resources not available. Will not validate Resource, ResourceConfig or Parameters')
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

    const [ , resourceType, resourceName ] = resource
    if (resourceType === 'module') {
      this.checkResource(name, state, resourceName)
    } else if (resourceType === 'function') {
      this.checkFunction(name, resourceName)
    }
  } // checkTask

  checkResource (name, state, resourceName) {
    if (!this.resources) return

    if (!this.resources[resourceName]) {
      return this.problems.push(`State Machine.States.${name}.Resource references a module '${resourceName}' which is not loaded.`)
    }

    const validated = this.checkResourceConfig(name, resourceName, state.ResourceConfig)
    this.checkParameters(name, resourceName, state.Parameters, validated)

  } // checkResource

  checkResourceConfig (name, resourceName, resourceConfig) {
    return this.checkSubObject(name, resourceName, resourceConfig, 'ResourceConfig')
  }

  checkParameters (name, resourceName, parameters, skipUnadornedName) {
    return this.checkSubObject(name, resourceName, parameters, 'Parameters', skipUnadornedName)
  } // checkParameters

  checkSubObject (name, resourceName, subObject, objectType, skipUnadornedName = false) {
    const validator = this.findValidator(resourceName, objectType, skipUnadornedName)

    if (!validator) {
      if (subObject) {
        this.problems.push(
          `State Machine.States.${name}.${objectType} exists, but no validator found`
        )
      }
      return
    }

    const problems = validator.validate(subObject || {})
    problems.forEach(p =>
      this.problems.push(`State Machine.States.${name}.${objectType} ${p}`)
    )
    return true
  } // checkSubObject

  findValidator (resourceName, objectType, skipUnadornedName) {
    const validators = this.validators[objectType]

    if (validators[resourceName]) {
      return validators[resourceName]
    }

    const validator = loadValidator(
      resourceName,
      this.resources[resourceName].rootDirPath,
      objectType,
      skipUnadornedName,
      this.logger
    )
    validators[resourceName] = validator
    return validator
  } // findValidator

  checkFunction (name, functionName) {
    if (!this.functions) return

    if (!this.functions[functionName]) {
      return this.problems.push(`State Machine.States.${name}.Resource references a function '${functionName}' which is not loaded.`)
    }
  }
} // CheckTaskNodes

function loadValidator (resourceName, rootDir, objectType, skipUnadornedName, logger) {
  const schemaNames = [`${kebabCase(objectType)}-schema`]
  if (!skipUnadornedName) schemaNames.push('schema')

  for (const [schemaType, validatorLoader] of Object.entries(schemaTypes)) {
    for (const schemaName of schemaNames) {
      const schemaFile = path.resolve(rootDir, `${schemaName}.${schemaType}`)
      if (fs.existsSync(schemaFile)) {
        try {
          return validatorLoader(schemaFile)
        } catch (err) {
          logger.error(`Couldn't load ${objectType} schema for ${resourceName}:\n  ${err.message}`)
          return null
        }
      } // if ...
    } // if ...
  } // for ...

  return null
} // loadValidator

function isObject (o) {
  return o && (typeof o === 'object')
} // isObject

module.exports = (stateResources, functions, logger) => new CheckTaskNodes(stateResources, functions, logger)
