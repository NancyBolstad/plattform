import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import {
  ApolloClientOptions,
  initializeApollo as initializeApolloFunc,
  InitializeApolloFunc,
} from './apollo/apolloClient'
import useApolloHook from './apollo/useApollo'
import makeWithApollo from './helpers/withApollo'

/**
 * Options that must only be provided once per application.
 */
type CreateApolloClientUtilitiesOptions = Pick<
  ApolloClientOptions,
  'apiUrl' | 'wsUrl' | 'mobileConfigOptions' | 'name' | 'version'
>

/**
 * Factory function that returns all needed utilities for the Apollo Client
 * with the application specific options being injected.
 * @param options Application specific options needed to connect to the graphql server.
 */
export function createApolloClientUtilities(
  options: CreateApolloClientUtilitiesOptions,
) {
  const useApollo = <P>(
    pageProps: P,
    providedApolloClient: ApolloClient<NormalizedCacheObject>,
  ): ApolloClient<NormalizedCacheObject> =>
    useApolloHook<P>(pageProps, {
      ...options,
      providedApolloClient,
    })

  const initializeApollo: InitializeApolloFunc = (
    initialCacheObject = null,
    { headers, onResponse },
  ) =>
    initializeApolloFunc(initialCacheObject, {
      ...options,
      headers,
      onResponse,
    })

  const withApollo = makeWithApollo(useApollo)

  return {
    useApollo,
    initializeApollo,
    withApollo,
  }
}

export { hasSubscriptionOperation } from './apollo/apolloLink'
export { APOLLO_STATE_PROP_NAME } from './apollo/apolloClient'
export type { PagePropsWithApollo } from './helpers/withApollo'

export { makeSSGDataFetchingHelpers } from './helpers/makeSSGDataFetchignHelpers'
export type {
  GetStaticPropsWithApollo,
  GetStaticPathsWithApollo,
} from './helpers/makeSSGDataFetchignHelpers'

export { makeSSRDataFetchingHelpers } from './helpers/makeSSRDataFetchingHelpers'
export type { GetServerSidePropsWithApollo } from './helpers/makeSSRDataFetchingHelpers'

export { makeWithDefaultSSR } from './helpers/withDefaultSSR'
