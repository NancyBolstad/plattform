import React, { Component, Fragment } from 'react'
import { css } from 'glamor'
import { compose } from 'react-apollo'
import { withRouter } from 'next/router'
import { Link, Router } from '../../lib/routes'
import {
  UnauthorizedMessage,
  WithMembership,
  WithoutMembership
} from '../Auth/withMembership'
import withMe from '../../lib/apollo/withMe'
import withT from '../../lib/withT'

import {
  CDN_FRONTEND_BASE_URL,
  GENERAL_FEEDBACK_DISCUSSION_ID
} from '../../lib/constants'
import { HEADER_HEIGHT, HEADER_HEIGHT_MOBILE } from '../constants'

import Frame from '../Frame'

import ActiveDiscussions from './ActiveDiscussions'
import ArticleDiscussionHeadline from './ArticleDiscussionHeadline'
import ArticleSearch from './ArticleSearch'
import LatestComments from './LatestComments'
import Discussion from '../Discussion/Discussion'

import {
  A,
  Button,
  Center,
  Interaction,
  Editorial,
  Label,
  mediaQueries
} from '@project-r/styleguide'
import FontSizeSync from '../FontSize/Sync'
import FontSizeAdjust from '../FontSize/Adjust'

import { ListWithQuery as TestimonialList } from '../Testimonial/List'

const tabMq = '@media only screen and (min-width: 468px)'

const styles = {
  container: css({
    padding: '20px 15px 120px 15px',
    [mediaQueries.mUp]: {
      padding: '55px 0 120px 0'
    }
  }),
  intro: css({
    marginBottom: 30,
    [mediaQueries.mUp]: {
      marginBottom: 40
    }
  }),
  tab: css({
    display: 'flex',
    flexWrap: 'wrap',
    marginBottom: 20,
    position: 'relative'
  }),
  tabButton: css({
    flexGrow: 1,
    width: '100%',
    [tabMq]: {
      width: '50%'
    }
  }),
  tabButton2: css({
    marginTop: -1,
    [tabMq]: {
      marginTop: 0,
      marginLeft: -1
    }
  }),
  articleHeadline: css({
    margin: '30px 0 20px 0',
    [mediaQueries.mUp]: {
      margin: '40px 0 20px 0'
    }
  }),
  activeDiscussions: css({
    marginTop: 30,
    [mediaQueries.mUp]: {
      marginTop: 40
    }
  }),
  selectedHeadline: css({
    margin: '40px 0 26px 0',
    [mediaQueries.mUp]: {
      margin: '60px 0 30px 0'
    }
  })
}

class FeedbackPage extends Component {
  constructor(props, ...args) {
    super(props, ...args)

    this.state = {
      loading: false,
      isMobile: true,
      searchValue: undefined
    }

    this.onChangeFromSearch = selectedObj => {
      const {
        router: { query }
      } = this.props
      if (!selectedObj) {
        return
      }
      const { discussionId, routePath, title } = selectedObj
      if (routePath) {
        Router.pushRoute(routePath)
        return
      }
      if (!discussionId || discussionId === query.id) {
        return
      }
      this.setState({
        searchValue: { text: title, value: selectedObj }
      })
      Router.pushRoute(
        'discussion',
        { id: discussionId, t: query.t },
        { shallow: true }
      )
    }

    this.onReset = () => {
      this.setState({
        searchValue: null
      })
    }

    this.handleResize = () => {
      const isMobile = window.innerWidth < mediaQueries.mBreakPoint
      if (isMobile !== this.state.isMobile) {
        this.setState({ isMobile })
      }
    }

    this.selectArticleTab = () => {
      const {
        router: { query }
      } = this.props
      const isSelected = query.t === 'article'
      Router.pushRoute(
        'discussion',
        isSelected ? undefined : { t: 'article' },
        { shallow: true }
      )
    }

    this.selectGeneralTab = () => {
      const {
        router: { query }
      } = this.props
      const isSelected = query.t === 'general'
      Router.pushRoute(
        'discussion',
        isSelected ? undefined : { t: 'general' },
        { shallow: true }
      )
    }

    this.scrollToArticleDiscussion = () => {
      const {
        router: { query }
      } = this.props
      if (
        !query.focus &&
        this.articleRef &&
        query.t === 'article' &&
        query.id
      ) {
        const headerHeight =
          window.innerWidth < mediaQueries.mBreakPoint
            ? HEADER_HEIGHT_MOBILE
            : HEADER_HEIGHT
        setTimeout(() => {
          const { top } = this.articleRef.getBoundingClientRect()
          window.scrollTo({
            top: top - headerHeight - 20,
            left: 0,
            behavior: 'smooth'
          })
        }, 100)
      }
    }
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize)
    this.handleResize()
    this.scrollToArticleDiscussion()
  }

  componentDidUpdate() {
    this.scrollToArticleDiscussion()
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize)
  }

  render() {
    const {
      t,
      me,
      router: { query }
    } = this.props
    const { searchValue } = this.state

    const tab = query.t

    const activeDiscussionId =
      tab === 'general'
        ? GENERAL_FEEDBACK_DISCUSSION_ID
        : tab === 'article' && query.id

    // meta tags for discussions are rendered in Discussion/Commments.js
    const pageMeta = activeDiscussionId
      ? undefined
      : {
          title: t('pages/feedback/title'),
          image: `${CDN_FRONTEND_BASE_URL}/static/social-media/logo.png`
        }

    return (
      <Frame raw meta={pageMeta}>
        <FontSizeSync />
        <Center {...styles.container}>
          <div {...styles.intro}>
            <WithoutMembership
              render={() => (
                <UnauthorizedMessage
                  {...{
                    me,
                    unauthorizedTexts: {
                      title: t('feedback/title'),
                      description: t.elements('feedback/unauthorized', {
                        buyLink: (
                          <Link key='pledge' route='pledge' passHref>
                            <A>{t('feedback/unauthorized/buyText')}</A>
                          </Link>
                        )
                      })
                    }
                  }}
                />
              )}
            />
            <WithMembership
              render={() => (
                <>
                  <Interaction.H1>{t('feedback/title')}</Interaction.H1>
                  <br />
                  <Interaction.P>
                    {t('feedback/lead')}
                    {!!tab && (
                      <>
                        {' '}
                        <Link route='discussion' passHref>
                          <A>{t('feedback/link/overview')}</A>
                        </Link>
                      </>
                    )}
                    {tab !== 'general' && (
                      <>
                        {' '}
                        <Link
                          route='discussion'
                          params={{ t: 'general' }}
                          passHref
                        >
                          <A>{t('feedback/link/general')}</A>
                        </Link>
                      </>
                    )}
                  </Interaction.P>
                </>
              )}
            />
          </div>
          {!!tab && (
            <div {...styles.selectedHeadline}>
              <div
                style={{
                  display: 'block',
                  textAlign: 'right',
                  marginTop: 3,
                  float: 'right',
                  width: 50
                }}
              >
                <FontSizeAdjust t={t} />
              </div>
              {tab === 'article' && (
                <ArticleDiscussionHeadline discussionId={activeDiscussionId} />
              )}
              {tab === 'general' && (
                <Interaction.H3>{t('feedback/general/title')}</Interaction.H3>
              )}
            </div>
          )}
          {!tab && (
            <>
              <Interaction.H3 style={{ marginTop: 10, marginBottom: 10 }}>
                {t('marketing/community/title/plain')}
              </Interaction.H3>
              <TestimonialList
                singleRow
                minColumns={3}
                first={5}
                share={false}
              />
              <div style={{ marginTop: 10 }}>
                <Link route='community' passHref>
                  <Editorial.A>{t('marketing/community/link')}</Editorial.A>
                </Link>
              </div>

              <WithMembership
                render={() => (
                  <Fragment>
                    {/*<div {...styles.articleHeadline}>
                      <Interaction.H3>
                        {t('feedback/article/headline')}
                      </Interaction.H3>
                    </div>
                    <ArticleSearch
                      value={searchValue}
                      onChange={this.onChangeFromSearch}
                      onReset={this.onReset}
                    />*/}
                    <div {...styles.activeDiscussions}>
                      <Interaction.H3
                        style={{ display: 'block', marginBottom: 10 }}
                      >
                        {t('feedback/activeDiscussions/label')}
                      </Interaction.H3>
                      <ActiveDiscussions
                        discussionId={activeDiscussionId}
                        onChange={this.onChangeFromActiveDiscussions}
                        onReset={this.onReset}
                        ignoreDiscussionId={GENERAL_FEEDBACK_DISCUSSION_ID}
                      />
                    </div>
                  </Fragment>
                )}
              />
            </>
          )}
          {activeDiscussionId && (
            <Discussion
              discussionId={activeDiscussionId}
              focusId={query.focus}
              mute={query && !!query.mute}
              meta
            />
          )}
          {!tab && (
            <WithMembership
              render={() => (
                <Fragment>
                  <div {...styles.selectedHeadline}>
                    <Interaction.H3>
                      {t('feedback/latestComments/headline')}
                    </Interaction.H3>
                  </div>
                  <LatestComments />
                </Fragment>
              )}
            />
          )}
        </Center>
      </Frame>
    )
  }
}

export default compose(
  withMe,
  withT,
  withRouter
)(FeedbackPage)
