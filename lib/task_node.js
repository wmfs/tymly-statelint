
const moduleRegex = /^module:(.+)$/

class CheckTaskNodes {
  constructor (stateResources) {
    this.resources = stateResources

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
    if (resource) {
      this.checkResource(name, state, resource[1])
    } else {
      this.problems.push(`State Machine.States.${name}.Resource '${state.Resource}' does not reference a Tymly module`)
    }
  } // checkTask

  checkResource (name, state, resourceName) {
    if (!this.resources) return

    if (!this.resources[resourceName]) {
      return this.problems.push(`State Machine.States.${name}.Resource references a module '${resourceName}' which is not loaded.`)
    }
  } // checkResource
} // CheckTaskNodes

function isObject (o) {
  return o && (typeof o === 'object')
} // isObject

module.exports = stateResources => new CheckTaskNodes(stateResources)
