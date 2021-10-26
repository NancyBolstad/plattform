import React, { useEffect, useRef, useState } from 'react'
import {
  A,
  Button,
  Interaction,
  InlineSpinner,
  FigureImage,
  Figure,
  useHeaderHeight,
  Label
} from '@project-r/styleguide'
import { Chart } from '@project-r/styleguide/chart'
import compose from 'lodash/flowRight'
import { graphql } from '@apollo/client/react/hoc'
import { gql } from '@apollo/client'
import { css } from 'glamor'
import voteT from './voteT'
import ErrorMessage from '../ErrorMessage'
import { ElectionActions, ElectionHeader } from './Election'
import { scrollIt } from '../../lib/utils/scroll'
const { P } = Interaction

const submitElectionBallotMutation = gql`
  mutation submitElectionBallot($electionId: ID!, $candidacyIds: [ID!]!) {
    submitElectionBallot(electionId: $electionId, candidacyIds: $candidacyIds) {
      id
      userHasSubmitted
      userSubmitDate
    }
  }
`

const emptyGifLink =
  'https://cdn.repub.ch/s3/republik-assets/assets/vote/empty.gif'

const styles = {
  charts: css({
    margin: '0 auto',
    maxWidth: 360
  }),
  confirm: css({
    textAlign: 'center',
    width: '80%',
    margin: '10px 0 15px 0'
  }),
  link: css({
    marginTop: 10
  }),
  chart: css({
    marginBottom: 20
  })
}

const CandidatesLocation = voteT(({ candidates, vt }) => {
  const values = candidates
    .filter(candidate => candidate.postalCodeGeo?.countryCode === 'CH')
    .reduce((acc, { postalCodeGeo, city }) => {
      const currentLocation = acc.find(
        point => point.postalCode === postalCodeGeo.postalCode
      )
      if (currentLocation) {
        currentLocation.count += 1
      } else {
        acc.push({
          ...postalCodeGeo,
          city,
          count: 1
        })
      }
      return acc
    }, [])
    .map(point => ({
      ...point,
      lat: String(point.lat),
      lon: String(point.lon),
      value: String(point.count)
    }))

  return (
    <div {...styles.chart}>
      <Chart
        config={{
          type: 'SwissMap',
          heightRatio: 0.63,
          features: {
            url:
              'https://cdn.repub.ch/s3/republik-assets/assets/geo/ch-cantons-wo-lakes.json',
            object: 'cantons'
          },
          points: true,
          sizeRangeMax: 150,
          opacity: 0.5,
          colorLegend: false,
          tooltipLabel: '{city} {postalCode}',
          tooltipBody: 'Kandidatinnen: 1'
        }}
        values={values}
      />
    </div>
  )
})

const getPercentString = total => item => ({
  ...item,
  value: String(item.value / total)
})

const mapGender = gender =>
  gender === 'weiblich' || gender === 'männlich' ? gender : 'divers'

const CandidatesGender = voteT(({ candidates, vt }) => {
  const candidatesWithGender = candidates.filter(
    candidate => candidate?.user?.gender
  )
  const values = candidatesWithGender
    .reduce(
      (acc, candidate) =>
        acc.map(item =>
          item.key === mapGender(candidate.user.gender)
            ? { ...item, value: item.value + 1 }
            : item
        ),
      [
        { key: 'weiblich', value: 0 },
        { key: 'nichtbinär', value: 0 },
        { key: 'männlich', value: 0 }
      ]
    )
    .map(getPercentString(candidatesWithGender.length))

  return (
    <div {...styles.chart}>
      <Label>{vt('vote/election/confirm/gender/header')}</Label>
      <Chart
        config={{
          type: 'Bar',
          numberFormat: '.0%',
          color: 'key',
          colorMap: {
            weiblich: '#9467bd',
            ['nichtbinär']: 'neutral',
            ['männlich']: '#2ca02c'
          },
          colorSort: 'none',
          colorLegend: true,
          colorLegendValues: ['weiblich', 'nichtbinär', 'männlich'],
          domain: [0, 1],
          sort: 'none',
          inlineValue: true
        }}
        values={values.filter(v => v.value !== '0')}
      />
    </div>
  )
})

const getAge = birthYear => new Date().getFullYear() - birthYear

const getLabel = age =>
  age < 30
    ? '< 30'
    : age < 40
    ? '30-40'
    : age < 50
    ? '40-50'
    : age < 60
    ? '50-60'
    : '> 60'

const CandidatesAge = voteT(({ candidates, vt }) => {
  const candidatesWithBirthday = candidates.filter(
    candidate => candidate.yearOfBirth
  )
  const values = candidatesWithBirthday
    .reduce(
      (acc, candidate) =>
        acc.map(item =>
          item.key === getLabel(getAge(candidate.yearOfBirth))
            ? { ...item, value: item.value + 1 }
            : item
        ),
      [
        { key: '< 30', value: 0 },
        { key: '30-40', value: 0 },
        { key: '40-50', value: 0 },
        { key: '50-60', value: 0 },
        { key: '> 60 Jahre', value: 0 }
      ]
    )
    .map(getPercentString(candidatesWithBirthday.length))

  return (
    <div {...styles.chart}>
      <Label>{vt('vote/election/confirm/age/header')}</Label>
      <Chart
        config={{
          type: 'Bar',
          numberFormat: '.0%',
          color: 'key',
          colorMap: {
            ['< 30']: '#1f77b4',
            ['30-40']: '#ff7f0e',
            ['40-50']: '#2ca02c',
            ['50-60']: '#d62728',
            ['> 60 Jahre']: '#9467bd'
          },
          colorSort: 'none',
          colorLegend: true,
          colorLegendValues: ['< 30', '30-40', '40-50', '50-60', '> 60 Jahre'],
          domain: [0, 1],
          sort: 'none',
          inlineValue: true
        }}
        values={values.filter(v => v.value !== '0')}
      />
    </div>
  )
})

const ElectionConfirm = compose(
  voteT,
  graphql(submitElectionBallotMutation, {
    props: ({ mutate }) => ({
      submitElectionBallot: (electionId, candidacyIds) => {
        return mutate({
          variables: {
            electionId,
            candidacyIds
          }
        })
      }
    })
  })
)(({ election, vote, submitElectionBallot, goBack, vt }) => {
  const [isUpdating, setUpdating] = useState(false)
  const [error, setError] = useState(null)
  const ref = useRef()
  const [headerHeight] = useHeaderHeight()

  useEffect(() => {
    const { top } = ref.current.getBoundingClientRect()
    const { pageYOffset } = window
    const target = pageYOffset + top - headerHeight - 80
    scrollIt(target, 100)
  }, [])

  const selectedCandidates = vote
    .filter(item => item.selected)
    .map(item => item.candidate)

  const submitBallot = async () => {
    setUpdating(true)
    await submitElectionBallot(
      election.id,
      selectedCandidates.map(candidate => candidate.id)
    )
      .then(() => {
        setUpdating(false)
        setError(null)
        goBack()
      })
      .catch(error => {
        setUpdating(false)
        setError(error)
      })
  }

  const { numSeats } = election
  const givenVotes = vote.filter(item => item.selected).length
  const remainingVotes = numSeats - givenVotes

  const confirmation = (
    <P {...styles.confirm}>
      {givenVotes < numSeats
        ? vt.pluralize('vote/election/labelConfirmCount', {
            count: givenVotes,
            numSeats,
            remaining: remainingVotes
          })
        : vt.pluralize('vote/election/labelConfirmAll', {
            numSeats,
            count: givenVotes
          })}
    </P>
  )

  const actions = (
    <>
      <Button primary onClick={submitBallot}>
        {isUpdating ? (
          <InlineSpinner size={40} />
        ) : (
          vt('vote/election/labelConfirm')
        )}
      </Button>
      <A href='#' {...styles.link} onClick={goBack}>
        {vt('vote/election/confirm/back')}
      </A>
    </>
  )

  return (
    <ElectionActions>
      <div ref={ref} {...styles.confirm}>
        <Interaction.P>
          <strong>{vt('vote/election/confirm/header')}</strong>
        </Interaction.P>
        {!givenVotes ? (
          <Figure>
            <FigureImage src={emptyGifLink} maxWidth={500} alt='Leer' />
          </Figure>
        ) : (
          <>
            <div {...styles.charts}>
              <CandidatesLocation candidates={selectedCandidates} />
              <CandidatesGender candidates={selectedCandidates} />
              <CandidatesAge candidates={selectedCandidates} />
            </div>
          </>
        )}
      </div>
      {error && <ErrorMessage error={error} />}
      {confirmation}
      {actions}
    </ElectionActions>
  )
})

export default ElectionConfirm
