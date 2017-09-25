import React from 'react'
import { matchBlock } from '../../utils'
import { LIST, LI } from './constants'
import { ULButton, OLButton } from './ui'
import { serializer as paragraphSerializer, PARAGRAPH } from '../paragraph'
import MarkdownSerializer from '../../../../lib/serializer'
import addValidation from '../../utils/serializationValidation'
import { Block } from 'slate'

const listItem = {
  match: matchBlock(LI),
  matchMdast: (node) => node.type === 'listItem',
  fromMdast: (node, index, parent, visitChildren) => ({
    kind: 'block',
    type: LI,
    nodes: paragraphSerializer.fromMdast(node.children)
  }),
  toMdast: (object, index, parent, visitChildren) => ({
    type: 'listItem',
    children: paragraphSerializer.toMdast(object.nodes)
  }),
  render: ({ children, node }) => (
    <li>{ children }</li>
  )
}

const itemSerializer = new MarkdownSerializer({
  rules: [
    listItem
  ]
})

const list = {
  match: matchBlock(LIST),
  matchMdast: (node) => node.type === 'list',
  fromMdast: (node, index, parent, visitChildren) => ({
    kind: 'block',
    type: LIST,
    data: {
      ordered: node.ordered,
      start: node.start
    },
    nodes: itemSerializer.fromMdast(node.children)
  }),
  toMdast: (object, index, parent, visitChildren, context) => ({
    type: 'list',
    ordered: object.data.ordered,
    start: object.data.start || 1,
    children: itemSerializer.toMdast(object.nodes, context)
  }),
  render: ({ children, node }) => node.data.get('ordered')
    ? <ol start={node.data.get('start')}>{ children }</ol>
    : <ul>{ children }</ul>
}

export const serializer = new MarkdownSerializer({
  rules: [
    list
  ]
})

export const newBlock = ({ordered = false}) => Block.fromJSON(
  list.fromMdast({
    ordered,
    children: [
      {
        type: 'listItem',
        children: [
          {
            type: 'paragraph',
            children: []
          }
        ]
      }
    ],
    data: {}
  })
)

addValidation(list, serializer, 'list')

export {
  LIST,
  ULButton,
  OLButton
}

export default {
  plugins: [
    {
      onKeyDown (event, data, change) {
        const isBackspace = data.key === 'backspace'
        if (data.key !== 'enter' && !isBackspace) return

        const { state } = change
        const inList = state.document.getClosest(state.startBlock.key, matchBlock(LIST))
        if (!inList) return

        event.preventDefault()

        const inItem = state.document.getClosest(state.startBlock.key, matchBlock(LI))
        const isEmpty = !inItem || !inItem.text

        if (isEmpty && (!isBackspace || inList.nodes.size === 1)) {
          return change.unwrapBlock()
        }

        if (isBackspace) {
          const t = change.deleteBackward()
          if (isEmpty) {
            t.removeNodeByKey(inItem.key)
          }
          return t
        }

        return change.splitBlock(2)
      },
      schema: {
        rules: [
          {
            match: matchBlock(LIST),
            validate: node => {
              const notItems = node.nodes
                .filter(n => n.type !== LI)

              return notItems.size
                ? notItems
                : null
            },
            normalize: (change, object, notItems) => {
              notItems.forEach(child => {
                if (child.kind === 'block') {
                  change.unwrapNodeByKey(child.key)
                } else {
                  change.wrapBlockByKey(child.key, LI)
                }
              })

              return change
            }
          },
          {
            match: matchBlock(LI),
            validate: node => {
              const notParagraphs = node.nodes
                .filter(n => n.type !== PARAGRAPH)

              return notParagraphs.size
                ? notParagraphs
                : null
            },
            normalize: (change, object, notParagraphs) => {
              notParagraphs.forEach(child => {
                if (child.kind === 'block') {
                  change.unwrapNodeByKey(child.key)
                } else {
                  change.wrapBlockByKey(child.key, PARAGRAPH)
                }
              })

              return change
            }
          },
          list,
          listItem
        ]
      }
    }
  ]
}
