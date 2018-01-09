const t = require('../../../lib/t')
const Roles = require('../../../lib/Roles')
const { DestroySessionError } = require('../../../lib/errors')
const ensureSignedIn = require('../../../lib/ensureSignedIn')
const { clearAllUserSessions, destroySession } = require('../../../lib/Sessions')
const userAccessRoles = ['admin', 'supporter']

module.exports = async (_, args, { pgdb, user: me, req }) => {
  ensureSignedIn(req)

  const {
    userId: foreignUserId
  } = args

  const user = foreignUserId
    ? (await pgdb.public.users.findOne({ userId: foreignUserId }))
    : me

  try {
    if (me.id === user.id) {
      // current user targeted, so we are going to destroy the current session before we do anything else
      await destroySession(req)
    }
    if (Roles.userIsMeOrInRoles(user, me, userAccessRoles)) {
      await clearAllUserSessions({ pgdb, store: req.sessionStore, userId: user.id })
    }
    return true
  } catch (e) {
    if (e instanceof DestroySessionError) {
      console.error('clearSessions: exception %O', { req: req._log(), userId: user.id, ...e.meta })
    } else {
      const util = require('util')
      console.error('clearSessions: exception', util.inspect({ req: req._log(), userId: user.id, e }, {depth: null}))
    }
    throw new Error(t('api/unauthorized'))
  }
}
