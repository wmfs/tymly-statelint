const path = require('path')
const fs = require('fs')
const j2119SubObjectValidator = require('./j2119_schema_loader')
const jsonSchemaValidator = require('./json_schema_loader')
const kebabCase = require('lodash.kebabcase')
const cloneDeep = require('lodash.clonedeep')
const isPath = require('@wmfs/j2119/lib/j2119/json_path_checker').isPath

const moduleRegex = /^(module|function):(.+)$/

const schemaTypes = {
  j2119: j2119SubObjectValidator,
  json: jsonSchemaValidator
}

class CheckTaskNodes {
  constructor (stateResources, functions, logger = console) {
    this.resources = stateResources
    this.functions = functions
    this.validators = {
      'Resource': { },
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

    const resourceConfig = state.ResourceConfig
    const [parameters, fixUps] = processReplacements(state.Parameters)

    const rcOk = this.checkResourceConfig(name, resourceName, resourceConfig)
    const pOk = this.checkParameters(name, resourceName, parameters, fixUps)

    if (rcOk && pOk) return

    const validator = this.findValidator(resourceName, 'Resource')
    if (validator && !resourceConfig && !parameters) {
      /* silence this for the moment
      this.problems.push(
        `State Machine.States.${name} has no ResourceConfig or Parameters object, but validation schema found.`
      )
      */
      return
    }

    const usedValidator = this.recheckResourceConfig(name, resourceConfig, rcOk, validator)
    this.recheckParameters(name, parameters, pOk, usedValidator ? null : validator, fixUps)
  } // checkResource

  recheckResourceConfig (name, resourceConfig, alreadyOk, validator) {
    return this.recheckSubObject(name, resourceConfig, 'ResourceConfig', alreadyOk, validator)
  } // recheckResourceConfig

  recheckParameters (name, parameters, alreadyOk, validator, fixUps) {
    return this.recheckSubObject(name, parameters, 'Parameters', alreadyOk, validator, fixUps)
  } // recheckParameters

  recheckSubObject (name, subObject, objectType, alreadyOk, validator, fixUps) {
    if (alreadyOk || !subObject) {
      return false
    }

    if (validator) {
      return this.validateSubObject(name, subObject, objectType, validator, fixUps)
    } else {
      this.problems.push(
        `State Machine.States.${name}.${objectType} exists, but no validator found`
      )
    }
  } // recheckSubObject

  checkResourceConfig (name, resourceName, resourceConfig) {
    return this.checkSubObject(name, resourceName, resourceConfig, 'ResourceConfig')
  }

  checkParameters (name, resourceName, parameters, fixUps) {
    for (const [field, path] of fixUps) {
      if (!isPath(path)) {
        this.problems.push(
          `State Machine.States.${name} Field "${field}" must be a Path`
        )
      }
    }

    return this.checkSubObject(name, resourceName, parameters, 'Parameters', fixUps)
  } // checkParameters

  checkSubObject (name, resourceName, subObject, objectType, fixUps) {
    const validator = this.findValidator(resourceName, objectType)

    if (!validator) return

    return this.validateSubObject(name, subObject, objectType, validator, fixUps)
  } // checkSubObject

  validateSubObject (name, subObject, objectType, validator, fixUps = []) {
    const problems = validator.validate(subObject || {})
      .filter(p => this.applyFixUps(p, fixUps))

    problems.forEach(p =>
      this.problems.push(`State Machine.States.${name}.${objectType} ${p}`)
    )
    return true
  } // validateSubObject

  applyFixUps (p, fixUps = []) {
    for (const [replacementName] of fixUps) {
      const notAllowed = `Field "${replacementName}" not allowed`
      if (p.indexOf(notAllowed) !== -1) return false

      const fieldName = replacementName.substring(0, replacementName.length - 2)
      const doesNotHave = `does not have required field "${fieldName}"`
      if (p.indexOf(doesNotHave) !== -1) return false
    } // for ...

    return true
  } // applyFixUps

  findValidator (resourceName, objectType) {
    const validators = this.validators[objectType]

    if (validators[resourceName]) {
      return validators[resourceName]
    }

    const validator = loadValidator(
      resourceName,
      this.resources[resourceName].rootDirPath,
      objectType,
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

/// ///////////////////////////////////////////////
function loadValidator (resourceName, rootDir, objectType, logger) {
  const schemaName = (objectType !== 'Resource')
    ? `${kebabCase(objectType)}-schema`
    : 'schema'

  for (const [schemaType, validatorLoader] of Object.entries(schemaTypes)) {
    const schemaFile = path.resolve(rootDir, `${schemaName}.${schemaType}`)
    if (fs.existsSync(schemaFile)) {
      try {
        return validatorLoader(schemaFile)
      } catch (err) {
        logger.error(`Couldn't load ${objectType} schema for ${resourceName}:\n  ${err.message}`)
        return null
      }
    } // if ...
  } // for ...

  return null
} // loadValidator

function isObject (o) {
  return o && (typeof o === 'object')
} // isObject

/// ///////////////////////////////////////////////////
function processReplacements (parameters) {
  if (!parameters) {
    return [ null, [] ]
  }

  const params = cloneDeep(parameters)
  const replacements = findSelectors(params)

  return [ params, replacements ]
}

function findSelectors (params, path = [], selectors = []) {
  for (const [key, value] of Object.entries(params)) {
    if (isSelector(key)) {
      selectors.push([ key, value ])
    } else if (typeof value === 'object') {
      findSelectors(value, [...path, key], selectors)
    }
  } // findSelectors

  return selectors
} // findSelectors

function isSelector (path) {
  return path.endsWith('.$')
} // isSelector

module.exports = (stateResources, functions, logger) => new CheckTaskNodes(stateResources, functions, logger)
