const yargs = require('yargs')
const PgDb = require('@orbiting/backend-modules-base/lib/PgDb')

const sendMailsToSegment = require('./sendMailsToSegment')

const argv = yargs
  .option('dry-run', {
    default: true,
  })
  .option('limit')
  .help()
  .version().argv

PgDb.connect().then(async (pgdb) => {
  if (argv.dryRun) {
    console.warn('In dry-run mode. Use --no-dry-run to send emails to segment.')
  }

  const mail = {
    subject: 'Reden Sie mit – und treffen Sie unsere Redaktion am 23. April',
    templateName: 'access_recipient_dialog_kampa202202',
  }

  console.log(
    [
      `Fetching user emails of special 8 week access grant.`,
      argv.limit && `Limiting to ${argv.limit} rows`,
    ]
      .filter(Boolean)
      .join(' '),
  )

  const result = await pgdb.query(
    [
      `SELECT u.email, ag.id`,
      `FROM "accessGrants" ag`,
      `JOIN "users" u`,
      `ON ag."recipientUserId" = u.id`,
      `WHERE ag."accessCampaignId" = 'b86c78c5-b36b-4de6-8656-44d5e1ba410b'`,
      `AND ag."beginAt" IS NOT NULL`,
      `AND ag."endAt" > now()`,
      `AND ag."invalidatedAt" IS NULL`,
      `AND ag.id NOT IN (
        SELECT "accessGrantId" 
        FROM "accessEvents" 
        WHERE event = 'email.recipient.dialog.kampa202202'
      )`,
      argv.limit && `LIMIT ${argv.limit}`,
    ]
      .filter(Boolean)
      .join(' '),
  ) /* AND ag."createdAt" >= '2022-03-03 11:00+01' */

  const accessEventMap = new Map(
    result.map((resultEntry) => {
      return [resultEntry.email, resultEntry.id]
    }),
  )
  const emailAddresses = [...accessEventMap.keys()]

  await sendMailsToSegment(emailAddresses, mail, {
    pgdb,
    argv,
    accessEventInfo: {
      accessEventMap,
      event: 'email.recipient.dialog.kampa202202',
    },
  })
  await pgdb.close()
  console.log('Done!')
})
