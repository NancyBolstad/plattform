import { forEachRow, Options, JobContext, JobFn } from '../../index'

const AGE_DAYS = 90

export default module.exports = function setup(
  options: Options,
  context: JobContext,
): JobFn {
  const { pgdb, debug } = context
  const { dryRun } = options
  const now = new Date()

  return async function () {
    const qryConditions = {
      'createdAt <': now.setDate(now.getDate() - AGE_DAYS),
    }

    const tx = await pgdb.transactionBegin()
    try {
      const handlerDebug = debug.extend('handler')
      const batchHandler = async function (ids: string[]): Promise<void> {
        debug('delete %s rows', ids.length)
        handlerDebug('delete ids: %o', ids)

        await tx.public.paymentsLog.delete({ id: ids })
      }

      await forEachRow(
        'paymentsLog',
        qryConditions,
        options,
        { batchHandler },
        context,
      )

      if (!dryRun) {
        await tx.transactionCommit()
      } else {
        await tx.transactionRollback()
      }
    } catch (e) {
      await tx.transactionRollback()
      throw e
    }
  }
}
