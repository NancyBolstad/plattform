#!/usr/bin/env node
/**
 * Script will populate underlying data for RevenueStats.segments
 *
 * No options or arguments available.
 */
require('@orbiting/backend-modules-env').config()
const {
  lib: { ConnectionContext },
} = require('@orbiting/backend-modules-base')

const { populate } = require('../../../lib/RevenueStats/segments')

const applicationName =
  'backends republik script RevenueStats segments populate'

ConnectionContext.create(applicationName)
  .then(async (context) => {
    console.log('Begin...')
    await populate(context)
    console.log('Done.')

    return context
  })
  .then((context) => ConnectionContext.close(context))
