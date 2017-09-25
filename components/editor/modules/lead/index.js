import React from 'react'
import { css } from 'glamor'
import { Placeholder } from 'slate-react'
import { matchBlock } from '../../utils'
import { LEAD } from './constants'
// import { mq } from '../../styles'
import MarkdownSerializer from '../../../../lib/serializer'
import {serializer as paragraphSerializer, PARAGRAPH} from '../paragraph'

const styles = {
  lead: {
    fontWeight: 'bold',
    margin: 0,
    position: 'relative'
  }
}

const lead = {
  match: matchBlock(LEAD),
  matchMdast: (node) => node.type === 'blockquote',
  fromMdast: (node, index, parent, visitChildren) => ({
    kind: 'block',
    type: LEAD,
    nodes: node.children && node.children.length
      ? paragraphSerializer.fromMdast(node.children[0]).nodes
      : []
  }),
  toMdast: (object, index, parent, visitChildren) => ({
    type: 'blockquote',
    children: [
      paragraphSerializer.toMdast({
        kind: 'block',
        type: PARAGRAPH,
        nodes: object.nodes
      })
    ]
  }),
  render: ({ children, ...props }) =>
    <p {...css(styles.lead)}>
      <Placeholder
        state={props.state}
        node={props.node}
        firstOnly={false}
      >
        Lead
      </Placeholder>
      {children}
    </p>
}

export const serializer = new MarkdownSerializer({
  rules: [
    lead
  ]
})

export {
  LEAD
}

export default {
  plugins: [
    {
      schema: {
        rules: [
          lead
        ]
      }
    }
  ]
}
