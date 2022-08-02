const run = require('../run.js')

const dir = 'packages/backend-modules/voting/migrations/sqls'
const file = '20220713142647-revoke-submission'

exports.up = (db) => run(db, dir, `${file}-up.sql`)

exports.down = (db) => run(db, dir, `${file}-down.sql`)
