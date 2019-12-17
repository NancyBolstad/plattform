import React, { useState, useEffect } from 'react'
import withT from '../../lib/withT'

import Close from 'react-icons/lib/md/close'

import { Field } from '@project-r/styleguide'
import { compose } from 'react-apollo'
import withSearchRouter, { isDefaultFilter } from './withSearchRouter'
import { withAggregations } from './enhancers'
import { DEFAULT_AGGREGATION_KEYS } from './constants'
import { preselectFilter } from './Filters'
import track from '../../lib/piwik'
import InitState from './InitState'
import { useDebounce } from '../../lib/hooks/useDebounce'

const trackSearch = (query, data) => {
  if (data.loading || data.error) return
  const totalCount = data.search && data.search.totalCount
  track(['trackSiteSearch', query, false, totalCount])
}

const Form = compose(
  withSearchRouter,
  withAggregations,
  withT
)(
  ({
    urlQuery,
    updateUrlQuery,
    urlFilter,
    updateUrlFilter,
    resetUrl,
    dataAggregations,
    t,
    searchQuery,
    setSearchQuery
  }) => {
    const [focusRef, setFocusRef] = useState(null)
    const [formValue, setFormValue] = useState(searchQuery)
    const [slowFormValue] = useDebounce(formValue, 200)

    useEffect(() => {
      focusRef && focusRef.input && focusRef.input.focus()
    }, [focusRef])

    useEffect(() => {
      trackSearch(urlQuery, dataAggregations)
    }, [urlQuery])

    useEffect(() => {
      setSearchQuery(slowFormValue)
    }, [slowFormValue])

    const updateFilter = () =>
      isDefaultFilter(urlFilter) &&
      updateUrlFilter(preselectFilter(dataAggregations))

    const submit = e => {
      e.preventDefault()
      formValue &&
        formValue !== urlQuery &&
        updateUrlQuery(formValue).then(updateFilter)
    }

    const update = (_, value) => {
      setFormValue(value)
    }

    const reset = () => {
      setFormValue(undefined)
      resetUrl()
    }

    return (
      <>
        <form onSubmit={submit}>
          <Field
            ref={setFocusRef}
            label={t('search/input/label')}
            value={formValue}
            onChange={update}
            icon={
              formValue && (
                <Close
                  style={{ cursor: 'pointer' }}
                  size={30}
                  onClick={reset}
                />
              )
            }
          />
        </form>
        {!urlQuery && (
          <InitState query={searchQuery} dataAggregations={dataAggregations} />
        )}
      </>
    )
  }
)

const FormWrapper = compose(withSearchRouter)(({ urlQuery, urlFilter }) => {
  const [searchQuery, setSearchQuery] = useState(urlQuery)

  return (
    <Form
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      keys={DEFAULT_AGGREGATION_KEYS}
      urlFilter={urlFilter}
    />
  )
})

export default FormWrapper
