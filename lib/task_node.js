function checkTaskNodes (json, problems = []) {
  if (!isObject(json)) return

  checkStates(json.States, problems)

  return problems
} // checkTaskNode

function checkStates (states, problems) {
  if (!isObject(states)) return

  for (const [name, state] of Object.entries(states)) {
    checkTask(name, state, problems)
  }
} // checkStates

function checkTask (name, state, problems) {
  if (state.Type !== 'Task') return

  const resource = state.Resource
  if (!resource.match(/^module:.+/)) {
    problems.push(`State Machine.States.${name}.Resource does not reference a Tymly module`)
  }
} // checkTask

function isObject (o) {
  return o && (typeof o === 'object')
} // isObject

module.exports = checkTaskNodes
