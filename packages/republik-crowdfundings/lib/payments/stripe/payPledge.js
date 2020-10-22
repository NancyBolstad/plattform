const createCustomer = require('./createCustomer')
const createCharge = require('./createCharge')
const createSubscription = require('./createSubscription')
const addSource = require('./addSource')
const addPaymentMethod = require('./addPaymentMethod')
const { getPaymentMethods } = require('./paymentMethod')
const getClients = require('./clients')
const sleep = require('await-sleep')
const Redis = require('@orbiting/backend-modules-base/lib/Redis')

module.exports = (args) => {
  const { sourceId } = args
  if (sourceId) {
    return payWithSource(args)
  } else {
    return payWithPaymentMethod(args)
  }
}

const payWithSource = async ({
  pledgeId,
  total,
  sourceId,
  pspPayload,
  makeDefault = false,
  userId,
  pkg,
  transaction,
  pgdb,
  t,
}) => {
  const isSubscription = pkg.name === 'MONTHLY_ABO'

  // old charge threeDSecure
  const threeDSecure = pspPayload && pspPayload.type === 'three_d_secure'
  const rememberSourceId = threeDSecure
    ? pspPayload.three_d_secure.card
    : sourceId
  if (isSubscription && threeDSecure) {
    throw new Error(t('api/payment/subscription/threeDsecure/notSupported'))
  }

  let charge
  try {
    let deduplicatedSourceId
    if (!(await pgdb.public.stripeCustomers.findFirst({ userId }))) {
      if (!rememberSourceId) {
        console.error('missing sourceId', {
          userId,
          pledgeId,
          sourceId,
        })
        throw new Error(t('api/unexpected'))
      }
      await createCustomer({
        sourceId: rememberSourceId,
        userId,
        pgdb,
      })
    } else {
      // stripe customer exists
      deduplicatedSourceId = await addSource({
        sourceId: rememberSourceId,
        userId,
        pgdb,
        deduplicate: true,
        makeDefault,
      })
    }

    if (isSubscription) {
      await createSubscription({
        plan: pkg.name,
        userId,
        companyId: pkg.companyId,
        metadata: {
          pledgeId,
        },
        pgdb: transaction,
      })
    } else {
      charge = await createCharge({
        amount: total,
        userId,
        companyId: pkg.companyId,
        sourceId: threeDSecure ? sourceId : deduplicatedSourceId || sourceId,
        threeDSecure,
        pgdb: transaction,
      })
    }
  } catch (e) {
    console.info('stripe charge failed', { pledgeId, e })
    if (e.type === 'StripeCardError') {
      const translatedError = t('api/pay/stripe/' + e.code)
      if (translatedError) {
        throw new Error(translatedError)
      } else {
        console.warn('translation not found for stripe error', { pledgeId, e })
        throw new Error(e.message)
      }
    } else {
      console.error('unknown error on stripe charge', { pledgeId, e })
      throw new Error(t('api/unexpected'))
    }
  }

  // for subscriptions the payment doesn't exist yet
  // and is saved by the webhookHandler
  if (!isSubscription) {
    // save payment
    const payment = await transaction.public.payments.insertAndGet({
      type: 'PLEDGE',
      method: 'STRIPE',
      total: charge.amount,
      status: 'PAID',
      pspId: charge.id,
      pspPayload: charge,
    })

    // insert pledgePayment
    await transaction.public.pledgePayments.insert({
      pledgeId,
      paymentId: payment.id,
      paymentType: 'PLEDGE',
    })
  }

  return {
    status: 'SUCCESSFUL',
  }
}

const payWithPaymentMethod = async ({
  pledgeId,
  total,
  stripePlatformPaymentMethodId,
  pspPayload,
  makeDefault = false,
  userId,
  pkg,
  transaction,
  pgdb,
  t,
}) => {
  const { companyId } = pkg
  const isSubscription = pkg.name === 'MONTHLY_ABO'

  if (!stripePlatformPaymentMethodId) {
    console.error('missing stripePlatformPaymentMethodId')
    throw new Error(t('api/unexpected'))
  }

  let customer = await pgdb.public.stripeCustomers.findOne({
    userId,
    companyId,
  })

  // save paymentMethodId (to platform and connectedAccounts)
  if (!customer) {
    customer = await createCustomer({
      paymentMethodId: stripePlatformPaymentMethodId,
      userId: userId,
      pgdb,
    })
  } else {
    await addPaymentMethod({
      paymentMethodId: stripePlatformPaymentMethodId,
      userId: userId,
      pgdb,
    })
  }

  // load all paymentMethods and select the one for companyId
  let paymentMethodId
  const paymentMethods = await getPaymentMethods(userId, pgdb)
  const platformPaymentMethod = paymentMethods.find(
    (pm) => pm.id === stripePlatformPaymentMethodId,
  )
  if (platformPaymentMethod.companyId === companyId) {
    paymentMethodId = platformPaymentMethod.id
  } else {
    paymentMethodId = platformPaymentMethod.connectedPaymentMethods.find(
      (cpm) => cpm.companyId === companyId,
    ).id
  }
  if (!paymentMethodId) {
    console.error('missing paymentMethodId')
    throw new Error(t('api/unexpected'))
  }

  let stripeClientSecret
  if (!isSubscription) {
    // the paymentIntent needs to be created on the account of the company
    const { accounts } = await getClients(pgdb)
    const stripe = accounts.find((a) => a.company.id === companyId).stripe

    // customer needs to be attached to PaymentIntent
    // otherwise she can't use her saved paymentMethods
    const paymentIntent = await stripe.paymentIntents.create({
      setup_future_usage: 'off_session',
      amount: total,
      currency: 'chf',
      customer: customer.id,
      payment_method: paymentMethodId,
      metadata: {
        pledgeId: pledgeId,
      },
    })
    stripeClientSecret = paymentIntent.client_secret
  } else {
    // subscribe to get clientSecret from invoicePaymentActionRequired webhook
    let noAuthRequired
    const subscriber = Redis.connect()
    subscriber.on('message', (channel, message) => {
      if (message === 'no-auth-required') {
        noAuthRequired = true
      } else {
        stripeClientSecret = message
      }
    })
    subscriber.subscribe(`pledge:${pledgeId}:clientSecret`)

    await createSubscription({
      plan: pkg.name,
      userId,
      companyId: pkg.companyId,
      metadata: {
        pledgeId: pledgeId,
      },
      // ...paymentMethodId ? { default_payment_method: paymentMethodId } : {},
      pgdb: transaction,
    })

    // wait 15s max
    const maxMs = new Date().getTime() + 15 * 1000
    await (async () => {
      while (
        !noAuthRequired && // eslint-disable-line no-unmodified-loop-condition
        !stripeClientSecret && // eslint-disable-line no-unmodified-loop-condition
        new Date().getTime() < maxMs
      ) {
        await sleep(500)
      }
    })()

    subscriber.unsubscribe()
    Redis.disconnect(subscriber)
  }

  return {
    status: 'DRAFT',
    stripeClientSecret,
  }
}
