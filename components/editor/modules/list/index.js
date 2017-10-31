import React from 'react'
import { matchBlock } from '../../utils'
import { createListButton } from './ui'
import MarkdownSerializer from '../../../../lib/serializer'
import addValidation from '../../utils/serializationValidation'
import { Block } from 'slate'

export default ({rule, subModules, TYPE}) => {
  const itemModule = subModules.find(m => m.name === 'listItem')
  if (!itemModule) {
    throw new Error('Missing listItem submodule')
  }
  const itemSerializer = itemModule.helpers.serializer

  const LI = itemModule.TYPE

  const List = rule.component

  const list = {
    match: matchBlock(TYPE),
    matchMdast: (node) => node.type === 'list',
    fromMdast: (node, index, parent, visitChildren) => ({
      kind: 'block',
      type: TYPE,
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
    })
  }

  const serializer = new MarkdownSerializer({
    rules: [
      list
    ]
  })

  const newBlock = ({ordered = false}) => Block.fromJSON(
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

  addValidation(list, serializer, TYPE)

  return {
    TYPE,
    helpers: {
      serializer,
      newBlock
    },
    changes: {},
    ui: {
      blockFormatButtons: [
        createListButton({
          TYPE,
          ordered: false,
          label: 'Liste',
          newBlock
        }),
        createListButton({
          TYPE,
          ordered: true,
          label: 'Aufzählung',
          newBlock
        })
      ]
    },
    plugins: [
      {
        renderNode: ({ children, node, attributes }) => {
          if (node.type !== TYPE) return
          return (
            <List attributes={attributes} data={node.data.toJS()}>
              { children }
            </List>
          )
        },
        onKeyDown (event, change) {
          const isBackspace = event.key === 'Backspace'
          if (event.key !== 'Enter' && !isBackspace) return

          const { value } = change
          const inList = value.document.getClosest(value.startBlock.key, matchBlock(TYPE))
          if (!inList) return

          event.preventDefault()

          const inItem = value.document.getClosest(value.startBlock.key, matchBlock(LI))
          const isEmpty = !inItem || !inItem.text

          if (isEmpty && (!isBackspace || inList.nodes.size === 1)) {
            return change
              .unwrapBlock(TYPE)
              .unwrapBlock(LI)
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
          blocks: {
            [TYPE]: {
              nodes: [
                { types: [LI] }
              ],
              normalize: (change, reason, { child }) => {
                if (reason === 'child_type_invalid') {
                  if (child.kind === 'block') {
                    change.setNodeByKey(child.key, LI)
                  } else {
                    change.wrapBlockByKey(child.key, LI)
                  }
                }
              }
            }
          }
        }
      }
    ]
  }
}
