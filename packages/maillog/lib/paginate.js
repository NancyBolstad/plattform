const { paginate: { paginator } } = require('@orbiting/backend-modules-utils')

const { getError } = require('./record')

const getFilterFns = ({ errornous }) => {
  const stack = []

  if (errornous === true) {
    stack.push(record => !!getError(record))
  } else if (errornous === false) {
    stack.push(record => !getError(record))
  }

  return stack
}

const paginate = (records, args) => paginator(
  { first: 100, ...args },
  a => a,
  ({ filters = {} }) => {
    const filterFns = getFilterFns(filters)

    return records.filter(record => filterFns.every(filterFn => filterFn(record)))
  }
)

module.exports = {
  paginate
}
