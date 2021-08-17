import React from 'react'

import { createFormatter } from '../../../lib/translate'
import { Editorial } from '../../Typography'

import { default as Button } from '../../Button'
import { CommentComposer } from './CommentComposer'
import { DiscussionContext } from '../DiscussionContext'
import { MarkdownIcon, EtiquetteIcon } from '../../Icons'
import IconButton from '../../IconButton'
import { Label } from '../../Typography'

export { CommentComposerPlaceholder } from './CommentComposerPlaceholder'

const t = createFormatter(require('../../../lib/translations.json').data)
const someText = 'Das Tückische beim Crowdfunding ist, dass der Ansturm'

export const CommentComposerPlayground = () => {
  const [
    { counter, mode, initialText, tagRequired, maxLength },
    dispatch
  ] = React.useReducer(
    (state, action) => {
      if ('start' in action) {
        return {
          ...state,
          counter: state.counter + 1,
          mode: 'composer',
          initialText: action.start.initialText,
          tagRequired: action.start.tagRequired,
          maxLength: action.start.maxLength
        }
      } else if ('cancel' in action) {
        return { ...state, mode: 'initial' }
      } else if ('submit' in action) {
        return { ...state, mode: 'wait', ...action.submit }
      } else if ('reject' in action) {
        state.resolve({ error: action.reject.reason })
        return { ...state, mode: 'composer' }
      } else if ('accept' in action) {
        state.resolve({ ok: true })
        return { ...state, mode: 'initial' }
      }

      return state
    },
    {
      counter: 1,
      mode: 'composer',
      initialText: someText,
      tagValue: undefined,
      tagRequired: true
    }
  )

  const discussionContextValue = {
    discussion: {
      displayAuthor: {
        name: 'Adrienne Fichter',
        profilePicture: '/static/profilePicture1.png',
        credential: { description: 'Redaktorin', verified: false }
      },
      rules: { maxLength },
      tags: ['Lob', 'Kritik', 'Wunsch', 'Keine Angabe'],
      tagRequired
    },
    actions: {
      openDiscussionPreferences: () => Promise.resolve({ ok: true })
    },
    composerHints: [
      // If some snippets have unescaped asterisks, return hint.
      function formattingAsteriks(text) {
        // Split into snippets. If asteriks are more then two new lines
        // apart, Markdown will render * instead of wrapped text
        // in cursive.
        const snippets = text.split('\n\n')

        // It will split string by \* and glueing string back together.
        // All the is left are unescaped astriks.
        // Then we split string by * and count elements; length of
        // array is 1 + "amount of astriks".
        // If length is > 2, unescaped astriks are left which might
        // Markdown render wrapped text in cursive.
        const hasUnescapedAsterisks = snippet =>
          snippet
            .split('\\*')
            .join('')
            .split('*').length > 2

        if (snippets.some(hasUnescapedAsterisks)) {
          return (
            <Label>
              Die Eingabe **fett** wird <strong>fett</strong>, *kursiv* wird{' '}
              <i>kursiv</i> und aus Leser\*in wird Leser*in.
            </Label>
          )
        }

        return false
      },
      function strikethorugh(text) {
        const hasSwungDash = text.indexOf('~') > -1
        if (hasSwungDash) {
          return (
            <Label>
              Die Eingabe ~~durchgestrichen~~ wird{' '}
              <span style={{ textDecoration: 'line-through' }}>
                durchgestrichen
              </span>{' '}
              .
            </Label>
          )
        }
        return false
      },
      function formattingLinks(text) {
        const hasSwungDash = text.indexOf('http') > -1
        if (hasSwungDash) {
          return (
            <Label>
              Ein [Link](https://republik.ch) wird Ein{' '}
              <a href='https://www.republik.ch'>Link</a>.
            </Label>
          )
        }
        return false
      }
    ],
    composerSecondaryActions: (
      <div style={{ display: 'flex' }}>
        <IconButton title='Mood' Icon={EtiquetteIcon} />
        <IconButton title='Markdown' Icon={MarkdownIcon} />
      </div>
    )
  }

  return (
    <div>
      {mode !== 'initial' && (
        <DiscussionContext.Provider value={discussionContextValue}>
          <CommentComposer
            isRoot
            key={counter}
            t={t}
            initialText={initialText}
            onClose={() => {
              dispatch({ cancel: {} })
            }}
            onSubmit={(text, tags) =>
              new Promise(resolve => {
                dispatch({ submit: { resolve } })
              })
            }
          />
        </DiscussionContext.Provider>
      )}

      {mode === 'initial' && (
        <div style={{ margin: 20 }}>
          <div style={{ textAlign: 'center', margin: 20 }}>
            <Editorial.Lead>
              To get started, select in which initial state the composer should
              appear.
            </Editorial.Lead>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ margin: 4 }}>
              <Button
                primary
                onClick={() => {
                  dispatch({
                    start: {
                      initialText: undefined,
                      tagValue: undefined,
                      tagRequired: false,
                      maxLength: undefined
                    }
                  })
                }}
              >
                Blank
              </Button>
            </div>
            <div style={{ margin: 4 }}>
              <Button
                primary
                onClick={() => {
                  dispatch({
                    start: {
                      initialText: someText,
                      tagValue: 'Wunsch',
                      tagRequired: true,
                      maxLength: 60
                    }
                  })
                }}
              >
                Prefilled
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === 'wait' && (
        <div style={{ marginTop: 40, marginBottom: 20 }}>
          <div style={{ textAlign: 'center', margin: 20 }}>
            <Editorial.Lead>
              Does the backend accept or reject the comment?
            </Editorial.Lead>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ margin: 4 }}>
              <Button
                primary
                onClick={() => {
                  dispatch({
                    reject: {
                      reason:
                        'Sie sind zu früh. Bitte warten Sie, zwei Minuten bevor Sie wieder kommentieren.'
                    }
                  })
                }}
              >
                Reject
              </Button>
            </div>
            <div style={{ margin: 4 }}>
              <Button
                primary
                onClick={() => {
                  dispatch({ accept: {} })
                }}
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
