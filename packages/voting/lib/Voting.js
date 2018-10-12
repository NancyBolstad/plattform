const _ = require('lodash')

const { buildQueries } = require('./queries.js')
const queries = buildQueries('votings')
const {
  findBySlug
} = queries

const slugExists = async (slug, pgdb) => {
  return !!(await pgdb.public.votings.findFirst({
    slug
  }))
}

const create = async (input, pgdb) => {
  const voting = await pgdb.public.votings.insertAndGet(
    _.omit(input, ['options', 'allowedMemberships'])
  )

  if (input.options && input.options.length > 0) {
    await Promise.all(
      input.options.map(option =>
        pgdb.public.votingOptions.insert({
          votingId: voting.id,
          ...option
        })
      )
    )
  }

  if (input.allowedMemberships && input.allowedMemberships.length > 0) {
    await Promise.all(
      input.allowedMemberships.map(mr =>
        pgdb.public.votingMembershipRequirements.insert({
          votingId: voting.id,
          ...mr
        })
      )
    )
  }

  return findBySlug(input.slug, pgdb)
}

module.exports = {
  ...queries,
  slugExists,
  create
}
