import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import NextHead from 'next/head'
import { ApolloError, useQuery } from '@apollo/client'
import { checkRoles, meQuery } from '../apollo/withMe'
import { css } from 'glamor'
import { getInitials } from '../../components/Frame/User'

const HAS_ACTIVE_MEMBERSHIP_ATTRIBUTE = 'data-has-active-membership'
const HAS_ACTIVE_MEMBERSHIP_STORAGE_KEY = 'me.hasActiveMembership'

const ME_PORTRAIT_ATTRIBUTE = 'data-me-portrait'
export const ME_PORTRAIT_STORAGE_KEY = 'me.portraitOrInitials'

// Rule to hide elements while a statically generated page is fetching the active-user
css.global(`[${ME_PORTRAIT_ATTRIBUTE}="true"] [data-hide-if-me="true"]`, {
  display: 'none',
})

css.global('[data-show-if-me="true"]', {
  display: 'none',
})

css.global(`[${ME_PORTRAIT_ATTRIBUTE}="true"] [data-show-if-me="true"]`, {
  display: 'block',
})

css.global(
  `[${HAS_ACTIVE_MEMBERSHIP_ATTRIBUTE}="true"] [data-hide-if-active-membership="true"]`,
  {
    display: 'none',
  },
)

css.global('[data-show-if-active-membership="true"]', {
  display: 'none',
})

css.global(
  `[${HAS_ACTIVE_MEMBERSHIP_ATTRIBUTE}="true"] [data-show-if-active-membership="true"]`,
  {
    display: 'block',
  },
)

const AUTH_STATE_CHANGE_BROADCAST_STORAGE_KEY = 'authStateChangeBroadcast'

export type MeObjectType = {
  id: string
  username: string
  name: string
  initials: string
  firstName: string
  lastName: string
  email: string
  portrait: string
  roles: string[]
  isListed: boolean
  hasPublicProfile: boolean
  discussionNotificationChannels: string[]
  accessCampaigns: { id: string }[]
  prolongBeforeDate: string
  activeMembership: {
    id: string
    type: {
      name: string
    }
    endDate: string
    graceEndDate: string
  }
  progressConsent: boolean
}

type MeResponse = {
  me: MeObjectType | null
}

type MeContextValues = {
  me?: MeObjectType
  meLoading: boolean
  meError?: ApolloError
  meRefetch: any
  hasActiveMembership: boolean
  hasAccess: boolean
  isEditor: boolean
}

const MeContext = createContext<MeContextValues>({} as MeContextValues)

export const useMe = (): MeContextValues => useContext(MeContext)

type Props = {
  children: ReactNode
}

type AuthState = 'loading' | 'logged-in' | 'logged-out'

const MeContextProvider = ({ children }: Props) => {
  const { data, loading, error, refetch } = useQuery<MeResponse>(meQuery, {})

  const getAuthState = useCallback((): AuthState => {
    if (data && data.me) {
      return 'logged-in'
    }
    return 'logged-out'
  }, [data])

  const [authState, setAuthState] = useState(getAuthState())

  const me = data?.me
  const isMember = checkRoles(me, ['member'])
  const hasActiveMembership = !!me?.activeMembership
  const portraitOrInitials = me ? me.portrait ?? getInitials(me) : false

  const broadcastAuthenticationChange = (nextState) => {
    console.log('broadcastAuthenticationChange')
    localStorage.setItem(AUTH_STATE_CHANGE_BROADCAST_STORAGE_KEY, nextState)
    localStorage.removeItem(AUTH_STATE_CHANGE_BROADCAST_STORAGE_KEY)
  }

  const handleAuthenticationChangeBroadcast = useCallback(
    async (event: StorageEvent) => {
      console.log('Event:', event)

      // Ignore all events that aren't meant to broadcast auth-change and
      // ignore localStorage.removeItem
      if (
        event.key !== AUTH_STATE_CHANGE_BROADCAST_STORAGE_KEY ||
        event.newValue === null
      ) {
        return
      }

      if (
        (authState === 'logged-in' && event.newValue === 'logged-out') ||
        (authState === 'logged-out' && event.newValue === 'logged-in')
      ) {
        await refetch()
        return
      }
    },
    [authState, refetch],
  )

  useEffect(() => {
    if (loading) return

    if (portraitOrInitials) {
      document.documentElement.setAttribute(ME_PORTRAIT_ATTRIBUTE, 'true')
    } else {
      document.documentElement.removeAttribute(ME_PORTRAIT_ATTRIBUTE)
    }
    if (hasActiveMembership) {
      document.documentElement.setAttribute(
        HAS_ACTIVE_MEMBERSHIP_ATTRIBUTE,
        'true',
      )
    } else {
      document.documentElement.removeAttribute(HAS_ACTIVE_MEMBERSHIP_ATTRIBUTE)
    }

    try {
      if (portraitOrInitials) {
        localStorage.setItem(ME_PORTRAIT_STORAGE_KEY, portraitOrInitials)
      } else {
        localStorage.removeItem(ME_PORTRAIT_STORAGE_KEY)
      }

      if (hasActiveMembership) {
        localStorage.setItem(
          HAS_ACTIVE_MEMBERSHIP_STORAGE_KEY,
          String(hasActiveMembership),
        )
      } else {
        localStorage.removeItem(HAS_ACTIVE_MEMBERSHIP_STORAGE_KEY)
      }

      // eslint-disable-next-line no-empty
    } catch (e) {}
  }, [loading, portraitOrInitials, hasActiveMembership])

  // Sync loggedIn state between multiple tabs by observing localStorage changes
  useEffect(() => {
    const newAuthState = getAuthState()
    // In case the new authState diverges from the current authState,
    // broadcast to other tabs to update their state
    if (authState !== newAuthState) {
      setAuthState(newAuthState)
      broadcastAuthenticationChange(newAuthState)
    }
  }, [getAuthState])

  // Register a storage-event listener
  useEffect(() => {
    window.addEventListener('storage', handleAuthenticationChangeBroadcast)
    return () => {
      window.removeEventListener('storage', handleAuthenticationChangeBroadcast)
    }
  }, [handleAuthenticationChangeBroadcast])

  return (
    <MeContext.Provider
      value={{
        me: me,
        meLoading: loading,
        meError: error,
        meRefetch: refetch,
        hasActiveMembership,
        hasAccess: isMember,
        isEditor: checkRoles(me, ['editor']),
      }}
    >
      <NextHead>
        <script
          dangerouslySetInnerHTML={{
            __html: [
              'try{',
              `var value = localStorage.getItem("${HAS_ACTIVE_MEMBERSHIP_STORAGE_KEY}");`,
              `if (value && value === "true")`,
              `document.documentElement.setAttribute("${HAS_ACTIVE_MEMBERSHIP_ATTRIBUTE}", value);`,
              `if (localStorage.getItem("${ME_PORTRAIT_STORAGE_KEY}"))`,
              `document.documentElement.setAttribute("${ME_PORTRAIT_ATTRIBUTE}", "true");`,
              '} catch(e) {}',
            ].join(''),
          }}
        />
      </NextHead>
      {children}
    </MeContext.Provider>
  )
}

export default MeContextProvider
