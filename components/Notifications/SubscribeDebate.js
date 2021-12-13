import React, { useState, useEffect } from 'react'
import { css } from 'glamor'
import withT from '../../lib/withT'
import { Radio, inQuotes } from '@project-r/styleguide'
import compose from 'lodash/flowRight'
import { DISCUSSION_NOTIFICATION_OPTIONS } from '../Discussion/constants'
import { withDiscussionPreferences } from '../Discussion/graphql/enhancers/withDiscussionPreferences'
import { ErrorLabel } from '../ErrorMessage'

const styles = {
  radio: css({
    '& label': {
      display: 'flex',
      textAlign: 'left',
      alignItems: 'center',
      margin: '5px 0'
    },
    '& svg': {
      width: 16,
      height: 16
    }
  })
}

export const getSelectedDiscussionPreference = data =>
  (data &&
    data.discussion &&
    data.discussion.userPreference &&
    data.discussion.userPreference.notifications) ||
  (data && data.me && data.me.defaultDiscussionNotificationOption)

const SubscribeDebate = ({
  t,
  discussionId,
  discussionPreferences,
  setDiscussionPreferences,
  setAnimate,
  style
}) => {
  const [isMutating, setIsMutating] = useState()
  const [serverError, setServerError] = useState()
  if (
    !discussionPreferences ||
    !discussionPreferences.me ||
    !discussionPreferences.discussion ||
    !setDiscussionPreferences
  ) {
    return null
  }

  const notificationOptions = DISCUSSION_NOTIFICATION_OPTIONS.map(option => ({
    value: option,
    text: t(`SubscribeDebate/option/${option}/label`)
  }))

  const selectedValue = getSelectedDiscussionPreference(discussionPreferences)

  const updatePreferences = option => e => {
    e.stopPropagation(e)
    setIsMutating(true)
    setDiscussionPreferences(undefined, undefined, option.value).then(
      () => {
        setIsMutating(false)
        setServerError()
        setAnimate && setAnimate(true)
      },
      reason => {
        setIsMutating(false)
        setServerError(reason)
      }
    )
  }

  return (
    <div style={style}>
      <h4>
        {t('SubscribeDebate/title', {
          debate: inQuotes(discussionPreferences.discussion.title)
        })}
      </h4>
      <div {...styles.radio}>
        {notificationOptions.map(option => (
          <div key={option.value}>
            <Radio
              disabled={isMutating}
              value={option.value}
              checked={selectedValue === option.value}
              onChange={updatePreferences(option)}
            >
              <span>{option.text}</span>
            </Radio>
          </div>
        ))}
      </div>
      {serverError && <ErrorLabel error={serverError} />}
    </div>
  )
}

export default compose(withT, withDiscussionPreferences)(SubscribeDebate)
