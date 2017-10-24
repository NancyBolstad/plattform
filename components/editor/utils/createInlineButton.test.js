import React from 'react'
import test from 'tape'
import spy from 'spy'
import { shallow } from 'enzyme'
import createInlineButton from './createInlineButton'
import { State } from 'slate'

const rawDoc = {
  'nodes': [
    {
      kind: 'block',
      type: 'paragraph',
      nodes: [
        {
          kind: 'text',
          leaves: [
            {
              text: 'Hello MarkButton!'
            }
          ]
        }
      ]
    },
    {
      kind: 'block',
      type: 'lead',
      nodes: [
        {
          kind: 'text',
          leaves: [
            {
              text: 'We are blocks at your service.'
            }
          ]
        }
      ]
    },
    {
      kind: 'block',
      type: 'paragraph',
      nodes: [
        {
          kind: 'text',
          leaves: [
            {
              text: 'Tamper with us'
            }
          ]
        }
      ]
    }
  ]
}

const initialState = State.fromJSON({
  document: rawDoc
})
const Button = () => <span />
const InlineButton = createInlineButton({ type: 'link' })(Button)

test('utils.createInlineButton: blurred', assert => {
  assert.plan(1)
  const state = initialState

  const wrapper = shallow(
    <InlineButton
      state={state}
    />
  )

  assert.equal(
    !wrapper.find('Button').prop('active') && wrapper.find('Button').prop('disabled'),
    true,
    'renders as disabled and inactive'
  )
})

test('utils.createInlineButton: focused cursor on text without inlines', assert => {
  assert.plan(1)

  const state = initialState
    .change()
    .select({
      anchorKey: initialState.document.nodes.get(0).nodes.first().key,
      anchorOffset: 2,
      focusKey: initialState.document.nodes.get(0).nodes.first().key,
      focusOffset: 2
    })
    .focus()
    .state

  const wrapper = shallow(
    <InlineButton
      state={state}
    />
  )

  assert.equal(
    !wrapper.find('Button').prop('active') && wrapper.find('Button').prop('disabled'),
    true,
    'renders as disabled and inactive'
  )
})

test('utils.createInlineButton: focused cursor on text with the given inline', assert => {
  assert.plan(1)

  const state = initialState
    .change()
    .select({
      anchorKey: initialState.document.nodes.get(1).nodes.first().key,
      anchorOffset: 2,
      focusKey: initialState.document.nodes.get(1).nodes.first().key,
      focusOffset: 6
    })
    .wrapInline({
      type: 'link'
    })
    .focus()
    .state

  const wrapper = shallow(
    <InlineButton
      state={state}
    />
  )

  assert.equal(
    wrapper.find('Button').prop('active') && !wrapper.find('Button').prop('disabled'),
    true,
    'renders as enabled and active'
  )
})

test('utils.createInlineButton: selection containing text without any inlines', assert => {
  assert.plan(1)

  const state = initialState
    .change()
    .select({
      anchorKey: initialState.document.nodes.get(1).nodes.first().key,
      anchorOffset: 2,
      focusKey: initialState.document.nodes.get(1).nodes.first().key,
      focusOffset: 6
    })
    .focus()
    .state

  const wrapper = shallow(
    <InlineButton
      state={state}
    />
  )

  assert.equal(
    !wrapper.find('Button').prop('active') && !wrapper.find('Button').prop('disabled'),
    true,
    'renders as enabled and inactive'
  )
})

test('utils.createInlineButton: selection containing text with the given inline', assert => {
  assert.plan(1)

  const state = initialState
    .change()
    .select({
      anchorKey: initialState.document.nodes.get(1).nodes.first().key,
      anchorOffset: 2,
      focusKey: initialState.document.nodes.get(1).nodes.first().key,
      focusOffset: 6
    })
    .wrapInline({ type: 'link' })
    .moveStart(2)
    .moveEnd(2)
    .focus()
    .state

  const wrapper = shallow(
    <InlineButton
      state={state}
    />
  )

  assert.equal(
    wrapper.find('Button').prop('active') && !wrapper.find('Button').prop('disabled'),
    true,
    'renders as enabled and active'
  )
})

test('utils.createInlineButton: action on selection containing text without any inlines', assert => {
  assert.plan(1)

  const state = initialState
    .change()
    .select({
      anchorKey: initialState.document.nodes.get(1).nodes.first().key,
      anchorOffset: 2,
      focusKey: initialState.document.nodes.get(1).nodes.first().key,
      focusOffset: 6
    })
    .focus()
    .state

  const onChange = ({state: nextState}) => {
    assert.equal(
      nextState.inlines.size > 0,
      true,
      'wraps the text in the selection into an inline'
    )
  }

  const event = {
    preventDefault: spy()
  }

  const wrapper = shallow(
    <InlineButton
      state={state}
      onChange={onChange}
    />
  )

  wrapper.find('Button').simulate('mousedown', event)
})

test('utils.createInlineButton: action on cursor over a text wrapped in a given inline', assert => {
  assert.plan(1)

  const state = initialState
    .change()
    .select({
      anchorKey: initialState.document.nodes.get(1).nodes.first().key,
      anchorOffset: 2,
      focusKey: initialState.document.nodes.get(1).nodes.first().key,
      focusOffset: 6
    })
    .wrapInline({ type: 'link' })
    .moveStart(2)
    .moveEnd(-2)
    .focus()
    .state

  const onChange = change => {
    assert.equal(
      change.state.inlines.size,
      0,
      'unwraps all contents of the selected inline'
    )
  }

  const event = {
    preventDefault: spy()
  }

  const wrapper = shallow(
    <InlineButton
      state={state}
      onChange={onChange}
    />
  )

  wrapper.find('Button').simulate('mousedown', event)
})

test('utils.createInlineButton: action on selection containing text inside and outside an inline', assert => {
  assert.plan(2)

  const state = initialState
    .change()
    .select({
      anchorKey: initialState.document.nodes.get(1).nodes.first().key,
      anchorOffset: 2,
      focusKey: initialState.document.nodes.get(1).nodes.first().key,
      focusOffset: 6
    })
    .wrapInline({ type: 'link' })
    .moveStart(2)
    .moveEnd(2)
    .focus()
    .state

  const onChange = change => {
    assert.equal(
      change
        .moveStart(-2)
        .state
        .inlines.size,
      0,
      'unwraps all contents of the given inline'
    )
  }

  const event = {
    preventDefault: spy()
  }

  const wrapper = shallow(
    <InlineButton
      state={state}
      onChange={onChange}
    />
  )

  assert.equal(
    wrapper.find('Button').prop('active') && !wrapper.find('Button').prop('disabled'),
    true,
    'renders as enabled and active'
  )

  wrapper.find('Button').simulate('mousedown', event)
})
