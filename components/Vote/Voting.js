import React, { Fragment, useState } from 'react'
import { css } from 'glamor'
import {
  A,
  Button,
  InlineSpinner,
  Interaction,
  Radio,
  RawHtml
} from '@project-r/styleguide'
import { timeFormat } from '../../lib/utils/format'
import withMe from '../../lib/apollo/withMe'
import voteT from './voteT'
import { gql } from '@apollo/client'
import compose from 'lodash/flowRight'
import { graphql } from '@apollo/client/react/hoc'
import ErrorMessage from '../ErrorMessage'
import AddressEditor, { withAddressData } from './AddressEditor'
import SignIn from '../Auth/SignIn'
import { Card, sharedStyles } from './text'
import Loader from '../Loader'

const { P } = Interaction

const submitVotingBallotMutation = gql`
  mutation submitVotingBallot($votingId: ID!, $optionId: ID) {
    submitVotingBallot(votingId: $votingId, optionId: $optionId) {
      id
      userHasSubmitted
      userSubmitDate
    }
  }
`

const query = gql`
  query getVoting($slug: String!) {
    voting(slug: $slug) {
      id
      description
      slug
      beginDate
      endDate
      userSubmitDate
      userHasSubmitted
      userIsEligible
      options {
        id
        label
      }
    }
  }
`

const styles = {
  thankyou: css({
    padding: '30px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  }),
  confirm: css({
    margin: '30px 0 15px'
  }),
  content: css({
    padding: '0 15px'
  }),
  buttons: css({
    padding: '15px 0'
  })
}

const messageDateFormat = timeFormat('%e. %B %Y')

const VotingCard = ({ children }) => (
  <Card style={{ margin: '40px auto', maxWidth: 550 }}>{children}</Card>
)

const Voting = compose(
  voteT,
  withMe,
  graphql(submitVotingBallotMutation, {
    props: ({ mutate }) => ({
      submitVotingBallot: (votingId, optionId) => {
        return mutate({
          variables: {
            votingId,
            optionId
          }
        })
      }
    })
  }),
  withAddressData
)(({ voting, submitVotingBallot, me, addressData, vt, description }) => {
  const [selectedValue, selectValue] = useState(null)
  const [isConfirm, setConfirm] = useState(false)
  const [isUpdating, setUpdating] = useState(false)
  const [error, setError] = useState(null)

  const reset = e => {
    e.preventDefault()
    selectValue(null)
    setError(null)
    setConfirm(false)
  }

  const vote = () => {
    setUpdating(true)
    submitVotingBallot(voting.id, selectedValue)
      .then(() => {
        setUpdating(false)
        setError(null)
      })
      .catch(error => {
        setUpdating(false)
        setError(error)
      })
  }

  let dangerousDisabledHTML
  let showSignIn
  if (voting.userHasSubmitted) {
    dangerousDisabledHTML = vt('vote/voting/thankyou', {
      submissionDate: messageDateFormat(new Date(voting.userSubmitDate))
    })
  } else if (Date.now() > new Date(voting.endDate)) {
    dangerousDisabledHTML = vt('vote/voting/ended')
  } else if (!me) {
    dangerousDisabledHTML = vt('vote/voting/notSignedIn', {
      beginDate: timeFormat('%d.%m.%Y')(new Date(voting.beginDate))
    })
    showSignIn = true
  } else if (!voting.userIsEligible) {
    dangerousDisabledHTML = vt('vote/voting/notEligible')
  }

  if (voting.userIsEligible && !addressData.voteMe?.address) {
    return <AddressEditor />
  }

  if (dangerousDisabledHTML) {
    return (
      <>
        <div {...styles.thankyou}>
          <RawHtml
            type={P}
            dangerouslySetInnerHTML={{
              __html: dangerousDisabledHTML
            }}
          />
        </div>
        {showSignIn && <SignIn />}
      </>
    )
  }

  const resetLink = (
    <Interaction.P style={{ marginLeft: 30 }}>
      <A href='#' onClick={reset}>
        {vt(`vote/common/${isConfirm ? 'back' : 'reset'}`)}
      </A>
    </Interaction.P>
  )

  const choice = (
    <>
      <div {...styles.buttons}>
        {voting.options.map(({ id, label }) => (
          <Fragment key={id}>
            <Radio
              black
              value={id}
              checked={id === selectedValue}
              disabled={!!isUpdating}
              onChange={() => selectValue(id)}
            >
              <span style={{ marginRight: 30 }}>
                {vt(`vote/voting/option${label}`)}
              </span>
            </Radio>
          </Fragment>
        ))}
      </div>
      <div {...sharedStyles.buttons}>
        <Button
          key={'vote/voting/labelVote'}
          primary
          onClick={() => setConfirm(true)}
        >
          {vt('vote/common/continue')}
        </Button>
        {selectedValue !== null && resetLink}
      </div>
      <div {...sharedStyles.hint}>{vt('vote/common/help/blank')}</div>
    </>
  )

  const confirmation = (
    <>
      <div {...styles.confirm}>
        <P>
          {selectedValue
            ? `Mit ${vt(
                `vote/voting/option${
                  voting.options.find(o => o.id === selectedValue).label
                }`
              )} stimmen? `
            : `Leer einlegen? `}
        </P>
      </div>
      <div {...sharedStyles.buttons}>
        <Button key={'vote/voting/labelVote'} primary onClick={vote}>
          {isUpdating ? (
            <InlineSpinner size={40} />
          ) : (
            vt('vote/voting/labelVote')
          )}
        </Button>
        {isUpdating ? <A>&nbsp;</A> : resetLink}
      </div>
    </>
  )

  return (
    <VotingCard>
      <div>
        <div {...styles.content}>
          <P>
            <strong>{description || voting.description}</strong>
          </P>
          {error && <ErrorMessage error={error} />}
          {isConfirm ? confirmation : choice}
        </div>
      </div>
    </VotingCard>
  )
})

const VotingLoader = compose(
  graphql(query, {
    options: ({ slug }) => ({
      variables: {
        slug
      }
    })
  })
)(({ data, description }) => (
  <Loader
    loading={data.loading}
    error={data.error}
    render={() => {
      if (!data.voting) return null
      return <Voting voting={data.voting} description={description} />
    }}
  />
))

export default VotingLoader
