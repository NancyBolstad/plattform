import React, { useState, useRef, useEffect } from 'react'
import { css } from 'glamor'
import { useSpring, animated, interpolate } from 'react-spring/web.cjs'
import { useGesture } from 'react-use-gesture/dist/index.js'
import { compose } from 'react-apollo'

import IgnoreIcon from 'react-icons/lib/md/notifications-off'
import FollowIcon from 'react-icons/lib/md/notifications-active'
import RevertIcon from 'react-icons/lib/md/rotate-left'
import OverviewIcon from 'react-icons/lib/md/list'

import withT from '../../lib/withT'
import { Link } from '../../lib/routes'
import { useWindowSize } from '../../lib/hooks/useWindowSize'
import sharedStyles from '../sharedStyles'

import Card from './Card'
import Container from './Container'
import Cantons from './Cantons'
import { Editorial, Interaction, mediaQueries, usePrevious, fontStyles } from '@project-r/styleguide'

const cardColors = {
  left: '#9F2500',
  right: 'rgb(8,48,107)',
  revert: '#EBB900'
}

const styles = {
  card: css({
    position: 'absolute',
    width: '100vw',
    top: 20,
    bottom: 80,
    minHeight: 340,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }),
  cardInner: css({
    position: 'relative',
    userSelect: 'none',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 12px 50px -10px rgba(0, 0, 0, 0.4), 0 10px 10px -10px rgba(0, 0, 0, 0.1)'
  }),
  swipeIndicator: css({
    position: 'absolute',
    textTransform: 'uppercase',
    padding: '3px 6px',
    borderRadius: 3,
    fontSize: 20,
    ...fontStyles.sansSerifMedium,
    color: '#fff',
    boxShadow: '0px 0px 15px -3px #fff',
    transition: 'opacity 300ms',
    transitionDelay: '100ms'
  }),
  swipeIndicatorLeft: css({
    transform: 'rotate(42deg)',
    right: 0,
    top: 50,
    backgroundColor: cardColors.left
  }),
  swipeIndicatorRight: css({
    transform: 'rotate(-12deg)',
    left: 10,
    top: 25,
    backgroundColor: cardColors.right
  }),
  button: css(sharedStyles.plainButton, {
    display: 'inline-block',
    borderRadius: '50%',
    margin: 10,
    [mediaQueries.mUp]: {
      margin: 20
    },
    lineHeight: 0,
    verticalAlign: 'middle',
    boxShadow: '0 12.5px 100px -10px rgba(50, 50, 73, 0.4), 0 10px 10px -10px rgba(50, 50, 73, 0.3)',
    transition: 'opacity 300ms'
  }),
  buttonSmall: css({
    width: 30,
    height: 30,
    padding: 5,
    '& svg': {
      width: 20,
      height: 20
    },
    [mediaQueries.mUp]: {
      width: 40,
      height: 40,
      padding: 10
    }
  }),
  buttonBig: css({
    width: 45,
    height: 45,
    padding: 10,
    '& svg': {
      width: 25,
      height: 25
    },
    [mediaQueries.mUp]: {
      width: 55,
      height: 55,
      padding: 15
    }
  }),
  buttonPanel: css({
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    textAlign: 'center'
  }),
  switch: css({
    position: 'absolute',
    left: 8,
    top: 5,
    maxWidth: '35%'
  }),
  canton: css(Interaction.fontRule, {
    position: 'absolute',
    right: 8,
    top: 5,
    textAlign: 'right',
    maxWidth: '64%',
    paddingRight: 40 + 10,
    '& svg': {
      width: 40,
      height: 40,
      position: 'absolute',
      right: 0,
      top: 0
    }
  })
}

const randDegs = 5
const to = () => ({
  x: 0, y: -5 + Math.random() * 10, scale: 1, rot: -randDegs + Math.random() * randDegs * 2, opacity: 1
})
const fromFall = () => ({
  x: 0, rot: 0, scale: 1.5, y: -1200, opacity: 1
})
const fromSwiped = ({ dir, velocity, xDelta }, windowWidth) => ({
  x: (200 + windowWidth) * dir,
  // how much the card tilts, flicking it harder makes it rotate faster
  rot: xDelta / 100 + dir * 10 * velocity,
  scale: 1
})

const interpolateTransform = (r, s) => `rotateY(${r / 10}deg) rotateZ(${r}deg) scale(${s})`

const SpringCard = ({
  index, zIndex, card, bindGestures, cardWidth,
  fallIn,
  isTop, isHot,
  dragTime,
  swiped, windowWidth,
  dragDir
}) => {
  const [props, set] = useSpring(() => fallIn && !swiped
    ? { ...to(), delay: index * 100, from: fromFall() }
    : {
      ...to(),
      ...swiped && fromSwiped(swiped, windowWidth),
      from: { opacity: 0 }
    }
  )
  const { x, y, rot, scale, opacity } = props
  const wasTop = usePrevious(isTop)
  useEffect(() => {
    if (isTop) {
      set({
        scale: 1.05,
        rot: 0,
        x: 0
      })
    } else if (wasTop) {
      set(to())
    }
  }, [isTop])
  useEffect(() => {
    if (swiped) {
      set({
        ...fromSwiped(swiped, windowWidth),
        delay: undefined,
        config: {
          friction: 50,
          tension: 200
        }
      })
    }
  }, [swiped, windowWidth])

  const willChange = isHot ? 'transform' : undefined
  const dir = dragDir || (swiped && swiped.dir)

  return (
    <animated.div {...styles.card} style={{
      transform: interpolate([x, y], (x, y) => `translate3d(${x}px,${y}px,0)`),
      zIndex: zIndex,
      willChange
    }}>
      <animated.div
        {...swiped
          ? undefined // prevent catching a card after swipping
          : bindGestures(set, card, isTop, index)}
        {...styles.cardInner}
        style={{
          width: cardWidth,
          height: cardWidth * 1.4,
          opacity,
          transform: interpolate([rot, scale], interpolateTransform),
          willChange
        }}
      >
        {card &&
          <Card key={card.id} {...card} width={cardWidth} dragTime={dragTime} />
        }
        <div
          {...styles.swipeIndicator}
          {...styles.swipeIndicatorLeft}
          style={{ opacity: dir === -1 ? 1 : 0 }}>
          ignorieren
        </div>
        <div
          {...styles.swipeIndicator}
          {...styles.swipeIndicatorRight}
          style={{ opacity: dir === 1 ? 1 : 0 }}>
          folgen
        </div>
      </animated.div>
    </animated.div>
  )
}

const nNew = 5
const nOld = 3
const Group = ({ t, group, fetchMore }) => {
  const allCards = group.cards.nodes
  const totalCount = group.cards.totalCount
  const [topIndex, setTopIndex] = useState(0)
  const [dragDir, setDragDir] = useState(false)

  // request more
  // ToDo: loading & error state
  useEffect(() => {
    if (topIndex >= allCards.length - 5 && group.cards.pageInfo.hasNextPage) {
      fetchMore(group.cards.pageInfo)
    }
  }, [topIndex, allCards.length, group.cards.pageInfo.hasNextPage])

  const [swipes, setSwipes] = useState([])
  const [windowWidth] = useWindowSize()
  const cardWidth = windowWidth > 500
    ? 320
    : windowWidth > 360 ? 300 : 240

  const dragTime = useRef(0)
  const onCard = useRef(false)

  useEffect(() => {
    const onTouchMove = event => {
      if (onCard.current) {
        event.preventDefault()
      }
    }
    window.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  const onSwipe = (swiped) => {
    setSwipes(swipes => {
      swipes[topIndex] = swiped
      return swipes
    })
    setTopIndex(topIndex + 1)
  }
  const onRevert = () => {
    if (topIndex < 1) {
      return
    }
    setSwipes(swipes => {
      swipes[topIndex - 1] = undefined
      return swipes
    })
    setTopIndex(topIndex - 1)
  }
  const activeCard = allCards[topIndex]
  const onRight = (e) => {
    if (!activeCard) {
      return
    }
    e.preventDefault()
    onSwipe({ dir: 1, xDelta: 0, velocity: 0.2, cardId: activeCard.id })
  }
  const onLeft = (e) => {
    if (!activeCard) {
      return
    }
    e.preventDefault()
    onSwipe({ dir: -1, xDelta: 0, velocity: 0.2, cardId: activeCard.id })
  }

  const bindGestures = useGesture(({ first, last, time, args: [set, card, isTop, index], down, delta: [xDelta], distance, direction: [xDir], velocity }) => {
    if (first) {
      dragTime.current = time
      onCard.current = true
    }
    if (last) {
      dragTime.current = time - dragTime.current
      onCard.current = false
    }

    const out = Math.abs(xDelta) > cardWidth / 2.5
    const trigger = velocity > 0.4 || out
    const dir = out
      ? xDelta < 0 ? -1 : 1
      : xDir < 0 ? -1 : 1

    const newDragDir = trigger && down && dir
    if (newDragDir !== dragDir) {
      setDragDir(newDragDir)
    }

    if (!down && trigger) {
      onSwipe({ dir, xDelta, velocity, cardId: card.id })
      return
    }

    const x = down ? xDelta : 0
    const rot = down ? xDelta / 100 : 0
    const scale = down || isTop ? 1.05 : 1

    set({
      x,
      rot,
      scale,
      delay: undefined,
      config: {
        friction: 50,
        tension: down ? 800 : 500
      }
    })
  })

  const Icon = Cantons[group.slug] || null

  return (
    <Container style={{ minHeight: cardWidth * 1.4 + 60 }}>
      <div {...styles.switch} style={{ zIndex: allCards.length + 1 }}>
        <Link route='cardGroups' passHref>
          <Editorial.A>Kanton wechseln</Editorial.A>
        </Link>
      </div>
      <div {...styles.canton}>
        <strong>Kanton {group.name}</strong><br />
        {totalCount} Kandidaturen
        {Icon && <Icon size={40} />}
      </div>
      {!!windowWidth && allCards.map((card, i) => {
        if (i + nOld < topIndex || i - nNew >= topIndex) {
          return null
        }
        const isTop = topIndex === i
        const fallIn = i < nNew
        return <SpringCard
          key={card.id}
          index={i}
          card={card}
          swiped={swipes[i]}
          dragTime={dragTime}
          windowWidth={windowWidth}
          cardWidth={cardWidth}
          fallIn={fallIn}
          isHot={
            isTop ||
            fallIn ||
            Math.abs(topIndex - i) === 1
          }
          isTop={isTop}
          dragDir={isTop && dragDir}
          zIndex={allCards.length - i}
          bindGestures={bindGestures} />
      })}

      <div {...styles.buttonPanel} style={{
        zIndex: allCards.length + 1
      }}>
        <button {...styles.button} {...styles.buttonSmall} style={{
          backgroundColor: cardColors.revert,
          opacity: topIndex > 0 ? 1 : 0
        }} onClick={onRevert}>
          <RevertIcon fill='#fff' />
        </button>
        <button {...styles.button} {...styles.buttonBig} style={{
          backgroundColor: cardColors.left
        }} onClick={onLeft}>
          <IgnoreIcon fill='#fff' />
        </button>
        <button {...styles.button} {...styles.buttonBig} style={{
          backgroundColor: cardColors.right
        }} onClick={onRight}>
          <FollowIcon fill='#fff' />
        </button>
        <button {...styles.button} {...styles.buttonSmall} style={{
          backgroundColor: '#4B6359' // disabled #B7C1BD
        }}>
          <OverviewIcon fill='#fff' />
        </button>
      </div>
    </Container>
  )
}

export default compose(
  withT
)(Group)
