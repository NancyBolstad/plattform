const debug = require('debug')('republik:lib:MembershipStats:geo')
const moment = require('moment')
const { getYears } = require('../trendYears')

const {
  cache: { create },
} = require('@orbiting/backend-modules-utils')

const QUERY_CACHE_TTL_SECONDS = 60 * 60 * 24 * 8 // A week and a day

const postalCodeParsers = {
  CH: (code) => parseInt(code.replace(/^CH[\s-]*/i, '')).toString(),
  DE: (code) => code.replace(/^D[\s-]*/i, '').split(' ')[0],
  AT: (code) => code.replace(/^A[\s-]*/i, '').split(' ')[0],
  BE: (code) => code.replace(/^B[\s-]*/i, '').split(' ')[0],
  DK: (code) => code.replace(/^DK[\s-]*/i, '').split(' ')[0],
  IT: (code) => code.replace(/^I[\s-]*/i, '').split(' ')[0],
  NL: (code) => parseInt(code.replace(/^NL[\s-]*/i, '')).toString(),
}

const createCache = (context) =>
  create(
    {
      namespace: 'republik',
      prefix: 'MembershipStats:geo',
      key: 'any',
      ttl: QUERY_CACHE_TTL_SECONDS,
    },
    context,
  )

const populate = async (context, resultFn) => {
  debug('populate')

  const { pgdb } = context
  const years = await getYears(pgdb)

  const memberships = await pgdb.query(`
    SELECT
      m.id,
      MIN(mp."beginDate") "minBeginDate",
      MAX(mp."endDate") "maxEndDate",
      a."country",
      a."postalCode"
    FROM "memberships" m
    JOIN "membershipPeriods" mp
      ON mp."membershipId" = m.id
    JOIN "users" u
      ON u.id = m."userId"
    LEFT JOIN "addresses" a
      ON a.id = u."addressId"
    WHERE m."userId" != 'f0512927-7e03-4ecc-b14f-601386a2a249' -- Jefferson
    GROUP BY m.id, a.id
  `)

  const countries = await pgdb.public.statisticsGeoCountry.findAll()

  const geo = {}

  for (const membership of memberships) {
    const country = !!membership.country.trim() && countries.find((country) => {
      return (
        country.name === membership.country ||
        country.searchNames.includes(membership.country.toLowerCase().trim())
      )
    })

    if (country) {
      const { name: countryName, code: countryCode } = country
      const postalCodeParser = postalCodeParsers[countryCode]

      const parsedPostalCode = postalCodeParser
        ? postalCodeParser(membership.postalCode)
        : membership.postalCode

      const postalCodeDetail = await pgdb.public.statisticsGeoPostalCode.findOne(
        { countryCode, postalCode: parsedPostalCode.trim() },
      )

      const key = `${countryName}${
        postalCodeDetail ? postalCodeDetail.postalCode : null
      }`

      if (!geo[key]) {
        const buckets = {}

        years.forEach((year) => {
          buckets[year] = { count: 0 }
        })

        Object.assign(geo, {
          [key]: {
            country: countryName,
            postalCode: postalCodeDetail ? postalCodeDetail.postalCode : null,
            lat: postalCodeDetail ? postalCodeDetail.lat : null,
            lon: postalCodeDetail ? postalCodeDetail.lon : null,
            buckets,
          },
        })
      }

      years.forEach((year) => {
        const yearBegin = moment(year)
        const yearEnd = yearBegin.clone().add(1, 'year')

        if (
          membership.minBeginDate < yearEnd &&
          membership.maxEndDate > yearBegin
        ) {
          geo[key].buckets[year].count++
        }
      })
    }
  }

  const result = Object.keys(geo).map((key) => {
    const { buckets, ...restGeo } = geo[key]

    return {
      ...restGeo,
      buckets: Object.keys(buckets).map((bucketKey) => {
        const bucket = buckets[bucketKey]

        return { ...bucket, key: bucketKey }
      }),
    }
  })

  if (resultFn) {
    return resultFn(result)
  }

  // Cache said data.
  await createCache(context).set({ result, updatedAt: new Date() })
}

module.exports = {
  createCache,
  populate,
}
