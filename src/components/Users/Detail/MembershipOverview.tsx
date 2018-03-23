import * as React from 'react'
import {
  Interaction,
  Label,
  Button,
  A,
  P,
  colors
} from '@project-r/styleguide'
import { Membership } from '../../../types/admin'
import withT from '../../../lib/withT'
import {
  swissTime,
  chfFormat
} from '../../../lib/utils/formats'
import List, { Item } from '../../List'

const dateTimeFormat = swissTime.format(
  '%e. %B %Y %H.%M Uhr'
)

const dateFormat = swissTime.format('%e. %B %Y')

const MembershipOverview = ({
  membership,
  t
}: {
  membership: Membership
  t: any
}) => {
  return (
    <div>
      <Interaction.H3>
        {membership.type.name
          .split('_')
          .join(' ')}{' '}
        –{' '}
        {dateTimeFormat(
          new Date(membership.createdAt)
        )}{' '}
        –{' '}
        {(!!membership.renew && 'ACTIVE') ||
          'INACTIVE'}
        <br />
        <Label>
          Created:{' '}
          {dateTimeFormat(
            new Date(membership.createdAt)
          )}
          {' – '}
          Updated:{' '}
          {dateTimeFormat(
            new Date(membership.updatedAt)
          )}
        </Label>
      </Interaction.H3>
      {!membership.renew && (
        <Label>
          Reason for cancelled membership
          <P>
            {membership.cancelReasons &&
              membership.cancelReasons.join('\n')}
          </P>
        </Label>
      )}
      <List>
        <Item>
          <Label>Abo-Nr.</Label>
          <br />
          #{membership.sequenceNumber}
          <br />
          {!!membership.voucherCode && (
            <Interaction.P>
              <Label>Voucher Code</Label>
              <br />
              {membership.voucherCode}
            </Interaction.P>
          )}
          {!!membership.claimerName && (
            <Interaction.P>
              <Label>Claimer Name</Label>
              <br />
              {membership.claimerName}
            </Interaction.P>
          )}
          <Interaction.P>
            <Label>Reduced Price</Label>
            <br />
            {membership.reducedPrice
              ? 'YES'
              : 'NO'}
          </Interaction.P>
          <Interaction.P>
            <Label>Periods</Label>
            <br />
            {membership.periods.map(
              (period, i) => (
                <span key={`period-${i}`}>
                  {dateTimeFormat(
                    new Date(period.beginDate)
                  )}
                  {' - '}
                  {dateTimeFormat(
                    new Date(period.endDate)
                  )}
                  <br />
                  <Label>
                    Created:{' '}
                    {dateTimeFormat(
                      new Date(period.createdAt)
                    )}
                    {' – '}
                    Updated:{' '}
                    {dateTimeFormat(
                      new Date(period.updatedAt)
                    )}
                  </Label>
                </span>
              )
            )}
          </Interaction.P>
        </Item>
      </List>
    </div>
  )
}

export default withT(MembershipOverview)
