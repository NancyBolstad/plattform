import React, { useState } from 'react'
import { graphql, compose } from 'react-apollo'
import { css, merge } from 'glamor'

import {
  fontFamilies,
  mediaQueries,
  fontStyles,
  Interaction,
  pxToRem,
  P,
  Loader,
  useColorContext
} from '@project-r/styleguide'

import gql from 'graphql-tag'
import { swissNumbers } from '../../lib/utils/format'

const count3Format = swissNumbers.format('.0f')
const count4Format = swissNumbers.format(',.0f')
const format = value => {
  if (String(Math.round(value)).length > 3) {
    return count4Format(value)
  }
  return count3Format(value)
}

const HEIGHT = 8

const styles = {
  container: css({}),
  bar: css({
    height: 8,
    marginTop: -20,
    marginBottom: 80,
    position: 'relative'
  }),
  barInner: css({
    height: '100%'
  }),
  goal: css({
    position: 'absolute',
    top: 0,
    left: 0,
    height: HEIGHT,
    backgroundColor: 'transparent',
    boxSizing: 'content-box',
    borderRightWidth: 2,
    borderRightStyle: 'solid'
  }),
  currentGoal: css({
    borderRight: 'none'
  }),
  goalNumber: css({
    fontFamily: fontFamilies.sansSerifMedium,
    fontSize: 14,
    lineHeight: '14px',
    borderRightWidth: 2,
    borderRightStyle: 'solid',
    textAlign: 'right',
    paddingTop: 12,
    paddingRight: 4
  }),
  goalBar: css({
    position: 'absolute',
    top: 0,
    left: 0,
    height: 8
  }),
  box: css({
    position: 'absolute',
    top: 40,
    left: 5,
    right: 5,
    fontFamily: fontFamilies.sansSerifMedium,
    fontSize: 14,
    lineHeight: '19px',
    padding: '12px 17px'
  }),
  arrow: css({
    position: 'absolute',
    top: 32,
    right: 15,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderWidth: '0 4px 8px 4px',
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent'
  }),
  noInteraction: css({
    pointerEvents: 'none'
  }),
  primaryNumber: css({
    display: 'block',
    marginBottom: -6,
    [mediaQueries.mUp]: {
      marginBottom: -8
    },
    fontSize: 80,
    ...fontStyles.sansSerifRegular,
    lineHeight: 1
  }),
  label: css(Interaction.fontRule, {
    display: 'block',
    fontSize: pxToRem(14),
    lineHeight: pxToRem(20),
    paddingTop: 8,
    paddingBottom: 8
  })
}

const query = gql`
  query getVotingTurnout($voting: String!) {
    voting(slug: $voting) {
      id
      result {
        groupTurnout {
          eligible
          submitted
        }
      }
    }
  }
`

const widthForGoal = (target, current) => {
  return Math.ceil(Math.min(1, current / target) * 1000000) / 10000 + '%'
}

const GoalBar = ({ data, goals, caption }) => {
  const [hover, setHover] = useState(undefined)
  const [colorScheme] = useColorContext()

  return (
    <Loader
      loading={data.loading}
      error={data.error}
      render={() => {
        const { voting } = data
        const { submitted, eligible } = voting.result.groupTurnout

        const sortedGoals = goals
          .map(g => ({
            number: g.number || Math.round(eligible * g.percent),
            ...g
          }))
          .filter(
            (d, i, numericGoals) =>
              i === numericGoals.findIndex(g => g.number === d.number)
          )
          .reduce((currentGoals, goal) => {
            if (!currentGoals.length) return currentGoals.concat(goal)
            const previousGoal = currentGoals[currentGoals.length - 1]
            const previousGoalIncomplete = previousGoal.number > submitted
            return previousGoalIncomplete
              ? currentGoals
              : currentGoals.concat(goal)
          }, [])
        const firstGoal = sortedGoals[0]
        const endGoal = sortedGoals[sortedGoals.length - 1]

        return (
          <div {...styles.container}>
            <P {...colorScheme.set('color', 'text')}>
              <span {...styles.primaryNumber}>{format(submitted)}</span>
              <span {...styles.label}>
                {caption
                  .replace('{currentGoal}', format(endGoal.number))
                  .replace('{firstGoal}', format(firstGoal.number))}
              </span>
            </P>
            <div
              {...styles.bar}
              {...colorScheme.set('backgroundColor', 'divider')}
              style={{
                zIndex: hover ? 1 : 0
              }}
            >
              <div
                {...styles.barInner}
                {...colorScheme.set('backgroundColor', 'primary')}
                style={{
                  width: widthForGoal(endGoal.number, submitted)
                }}
              />
              {goals.length > 1 &&
                sortedGoals.reverse().map((currentGoal, i) => (
                  <div
                    key={i}
                    {...merge(styles.goal, i === 0 && styles.currentGoal)}
                    {...colorScheme.set('borderBottomColor', 'secondaryBg')}
                    {...colorScheme.set('borderRightColor', 'default')}
                    style={{
                      width: widthForGoal(endGoal.number, currentGoal.number)
                    }}
                    onTouchStart={e => {
                      e.preventDefault()
                      setHover(currentGoal)
                    }}
                    onTouchEnd={() => setHover(undefined)}
                    onMouseOver={() => setHover(currentGoal)}
                    onMouseOut={() => setHover(undefined)}
                  >
                    {hover && currentGoal.number === hover.number && (
                      <div {...styles.noInteraction}>
                        <div
                          {...styles.goalBar}
                          {...colorScheme.set('backgroundColor', 'secondary')}
                          style={{
                            width: widthForGoal(currentGoal.number, submitted)
                          }}
                        />
                        <div
                          {...styles.goalNumber}
                          {...colorScheme.set('color', 'secondary')}
                          {...colorScheme.set('borderRightColor', 'secondary')}
                        >
                          {format(currentGoal.number)}
                        </div>
                        {!!hover.description && (
                          <div
                            {...styles.arrow}
                            {...colorScheme.set(
                              'borderBottomColor',
                              'secondary'
                            )}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              {!!hover && !!hover.description && (
                <div
                  {...styles.box}
                  {...colorScheme.set('backgroundColor', 'secondary')}
                >
                  <span
                    style={{ color: '#fff' }}
                    dangerouslySetInnerHTML={{
                      __html: hover.description.replace(
                        '{count}',
                        format(hover.number)
                      )
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )
      }}
    />
  )
}

export default compose(graphql(query))(GoalBar)
