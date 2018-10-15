function checkTaskNodes (json, stateResources, problems = []) {
  if (!isObject(json)) return

  checkStates(json.States, stateResources, problems)

  return problems
} // checkTaskNode

function checkStates (states, stateResources, problems) {
  if (!isObject(states)) return

  for (const [name, state] of Object.entries(states)) {
    checkTask(name, state, stateResources, problems)
  }
} // checkStates


const moduleRegex = /^module:(.+)$/
function checkTask (name, state, stateResources, problems) {
  if (state.Type !== 'Task') return

  const resource = moduleRegex.exec(state.Resource)
  if (resource) {
    checkResource (name, state, resource[1], stateResources, problems)
  } else {
    problems.push(`State Machine.States.${name}.Resource does not reference a Tymly module`)
  }
} // checkTask

function checkResource (name, state, resourceName, stateResources, problems) {
  if (!stateResources[resourceName]) {
    return problems.push(`State Machine.States.${name}.Resource references a module '${resourceName}' which is not loaded.`)
  }
} // checkResource

function isObject (o) {
  return o && (typeof o === 'object')
} // isObject

module.exports = checkTaskNodes
