import React, { useState, useEffect } from 'react'
import { withRouter } from 'next/router'
import { compose, graphql } from 'react-apollo'
import gql from 'graphql-tag'

import { Loader, Interaction, InlineSpinner, Button } from '@project-r/styleguide'

import ErrorMessage from '../ErrorMessage'

import Portrait from './Form/Portrait'
import Details from './Form/Details'
import Statement from './Form/Statement'
import CampaignBudget from './Form/CampaignBudget'
import VestedInterests from './Form/VestedInterests'
import { styles as formStyles } from './Form/styles'

const { H1, H2, P } = Interaction

const maybeCard = (data, apply) => {
  return data.me &&
    data.me.cards.nodes.length > 0 &&
    data.me.cards.nodes[0] &&
    apply(data.me.cards.nodes[0])
}

const initialVestedInterests = (data) => {
  const records =
    maybeCard(data, card => card.payload.vestedInterests) ||
    maybeCard(data, card => card.payload.vestedInterestsSmartvote) ||
    []

  return records.map((vestedInterest, index) => ({ id: `interest${index}`, ...vestedInterest }))
}

const Update = (props) => {
  const { router, data } = props

  const [portrait, setPortrait] = useState({ values: {} })
  const [statement, setStatement] = useState({ value: maybeCard(data, card => card.payload.statement) })
  const [budget, setBudget] = useState(() => ({ value: maybeCard(data, card => card.payload.campaignBudget) }))
  const [budgetComment, setBudgetComment] = useState(() => ({ value: maybeCard(data, card => card.payload.campaignBudgetComment) }))
  const [vestedInterests, setVestedInterests] = useState(() => ({ value: initialVestedInterests(data) }))
  const [showErrors, setShowErrors] = useState(false)
  const [serverError, setServerError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [autoUpdateCard, setAutoUpdateCard] = useState(false)

  useEffect(() => {
    if (autoUpdateCard) {
      setShowErrors(true)

      if (errorMessages.length === 0) {
        setLoading(true)

        props.updateCard({
          id: card.id,
          portrait: portrait.values.portrait,
          statement: statement.value,
          payload: {
            campaignBudget: budget.value,
            campaignBudgetComment: budgetComment.value,
            vestedInterests: vestedInterests.value
          }
        })
          .then(() => {
            // Success...
            console.log('Success')
            setLoading(false)
          })
          .catch(catchError)
      }

      setAutoUpdateCard(false)
    }
  }, [autoUpdateCard])

  if (data.loading || data.error) {
    return <Loader loading={data.loading} error={data.error} />
  }

  const { me } = data
  if (!me || me.cards.nodes.length === 0) {
    return (
      <>
        <H2 {...formStyles.heading}>Diese Seite ist Kandidatinnen und Kandidaten der Parlamentswahlen vorbehalten.</H2>
        <P {...formStyles.paragraph}>
          Ihrem Konto ist keine Wahltindär-Karte hinterlegt. Falls Sie sich für eine Kandidatur in
          den Nationalrat oder Ständerat angemeldet haben, können Ihre Wahltindär-Karte über
          den speziellen Link in der Begrüssungs-E-Mail übernehmen.
        </P>
        <P {...formStyles.paragraph}>
          Bei Schwierigkeiten, wenden Sie sich an wahlen19@republik.ch
        </P>
      </>
    )
  }

  const [ card ] = me.cards.nodes

  const handlePortrait = ({ values, errors }) => {
    setPortrait({
      values,
      errors
    })
  }

  const handleStatement = (value, shouldValidate) => {
    setStatement({
      ...statement,
      value,
      error: (
        (value.trim().length <= 0 && 'Statement fehlt')
      ),
      dirty: shouldValidate
    })
  }

  const handleBudget = (value, shouldValidate) => {
    setBudget({
      ...budget,
      value: String(value).replace(/[^0-9]/g, ''),
      error: false,
      dirty: shouldValidate
    })
  }

  const handleBudgetComment = (value, shouldValidate) => {
    setBudgetComment({
      ...budgetComment,
      value,
      error: false,
      dirty: shouldValidate
    })
  }

  const handleVestedInterests = (value, shouldValidate) => {
    setVestedInterests({
      ...vestedInterests,
      value,
      error: false,
      dirty: shouldValidate
    })
  }

  const updateCard = e => {
    e && e.preventDefault && e.preventDefault()

    handleStatement(statement.value, true)
    handlePortrait(portrait)
    handleBudget(budget.value, true)
    handleBudgetComment(budgetComment.value, true)

    setAutoUpdateCard(true)
  }

  const catchError = error => {
    setServerError(error)
    setLoading(false)
  }

  const findErrorMessages = () => {
    return [
      portrait.errors && portrait.errors.portrait,
      portrait.errors && portrait.errors.portraitPreview,
      statement.error,
      budget.error,
      budgetComment.error,
      vestedInterests.error
    ].filter(Boolean)
  }

  const errorMessages = findErrorMessages()

  return (
    <>
      {router.query.thank ? (
        <>
          <H1 {...formStyles.heading}>Ihre Wahltindär-Karte ist parat 🔥</H1>
          <P {...formStyles.paragraph}>
            Wir freuen uns, Sie an Bord unseres Wahltindär-Projektes begrüssen zu dürfen und sind
            in besonderem Masse begeistert, dass Sie sich die Zeit dafür genommen haben. Auf dieser Seite
            können Sie Angaben ändern oder weitere Informationen hinzufügen.
          </P>
        </>
      ) : (
        <>
          <H1 {...formStyles.heading}>Wahltindär (Upsert-Seite)</H1>
          <P {...formStyles.paragraph}>
            Ein toller, einleitender Satz. Mit ein bisschen Erklär-Dingens, dass auf dieser
            Seite eine Wahltindär-Karte angepasst und übernommen werden kann.
          </P>
        </>
      )}

      <H2 {...formStyles.heading}>Ihre Wahltindär-Karte</H2>

      <div {...formStyles.portraitAndDetails}>
        <div {...formStyles.portrait}>
          <Portrait
            user={me}
            values={portrait.values}
            errors={portrait.errors}
            onChange={handlePortrait} />
        </div>
        <div {...formStyles.details}>
          <Details card={card} user={me} />
        </div>
      </div>

      <div {...formStyles.section}>
        <Statement
          statement={statement}
          handleStatement={handleStatement} />
      </div>

      <div {...formStyles.section}>
        <CampaignBudget
          budget={budget}
          handleBudget={handleBudget}
          budgetComment={budgetComment}
          handleBudgetComment={handleBudgetComment} />
      </div>

      <div {...formStyles.section}>
        <VestedInterests
          vestedInterests={vestedInterests}
          handleVestedInterests={handleVestedInterests} />
      </div>

      {showErrors && errorMessages.length > 0 && (
        <div {...formStyles.errorMessages}>
          Fehler<br />
          <ul>
            {errorMessages.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div {...formStyles.button}>
        {loading
          ? <InlineSpinner />
          : <Button
            primary
            type='submit'
            block
            onClick={updateCard}
            disabled={showErrors && errorMessages.length > 0}>
            Speichern
          </Button>
        }
      </div>

      {serverError && <ErrorMessage error={serverError} />}
    </>
  )
}

const fragmentCard = gql`
  fragment Card on Card {
    id
    payload
    group {
      id
      name
    }
  }
`

const ME_CARD = gql`
  query updateCardForm {
    me {
      id
      name
      isUserOfCurrentSession
      portrait(properties:{width:600 height:800 bw:false})
      cards(first: 1) {
        nodes {
          ...Card
        }
      }
    }
  }

  ${fragmentCard}
`

const withMeCard = graphql(ME_CARD)

const UPDATE_CARD = gql`
  mutation updateCard(
    $id: ID!
    $portrait: String
    $statement: String!
    $payload: JSON!
  ) {
    updateCard(
      id: $id
      portrait: $portrait
      statement: $statement
      payload: $payload
    ) {
      ...Card
    }
  }

  ${fragmentCard}
`

const withUpdateCard = graphql(
  UPDATE_CARD,
  {
    props: ({ mutate }) => ({
      updateCard: ({ id, portrait, statement, payload }) => mutate({
        variables: { id, portrait, statement, payload }
      })
    })
  }
)

export default compose(withRouter, withMeCard, withUpdateCard)(Update)
