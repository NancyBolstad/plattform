import React from 'react'
import SubscribeCheckbox from './SubscribeCheckbox'
import withT from '../../lib/withT'

const SubscribeAuthor = ({ t, subscriptions, setAnimate, style }) => {
  return (
    <div style={style}>
      <h4>{t('SubscribeAuthors/title')}</h4>
      {subscriptions.map(subscription => (
        <SubscribeCheckbox
          key={subscription.object.id}
          subscription={subscription}
          setAnimate={setAnimate}
          callout
        />
      ))}
    </div>
  )
}

export default withT(SubscribeAuthor)
