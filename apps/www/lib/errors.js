import fetch from 'isomorphic-unfetch'
import { Component } from 'react'
import getConfig from 'next/config'

const { publicRuntimeConfig } = getConfig()

let lastError

export const reportError = (context, error) => {
  // do not track server side
  if (typeof window === 'undefined') {
    return
  }
  // avoid double reporting from window.onerror
  if (lastError && lastError.trim() === error.trim()) {
    return
  }
  fetch('/api/reportError', {
    method: 'POST',
    body: `${context}\n${window.location.href}\n${
      publicRuntimeConfig.buildId
        ? `(buildId: ${publicRuntimeConfig.buildId})\n`
        : ''
    }${error}`,
  })
  lastError = error
}

export class ErrorBoundary extends Component {
  componentDidCatch(error, info) {
    reportError(
      'componentDidCatch',
      `${error}${info.componentStack}\n${error && error.stack}`,
    )
  }

  render() {
    return <>{this.props.children}</>
  }
}
