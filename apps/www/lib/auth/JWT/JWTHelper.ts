import * as jose from 'jose'
import { NextRequest } from 'next/server'
import * as cookie from 'cookie'
import {
  isValidJWTPayload,
  JWTPayloadValidationError,
  Payload,
} from './Payload'

/**
 * Load the public key from env-variables and parse to work with `jose`
 */
async function loadPublicKey() {
  const rawPublicKey = process.env.JWT_PUBLIC_KEY
    ? Buffer.from(process.env.JWT_PUBLIC_KEY, 'base64').toString()
    : null
  const publicKey = await jose.importSPKI(rawPublicKey, 'RS256')
  if (!publicKey) {
    throw new Error('JWT_PUBLIC_KEY is not defined')
  }
  return publicKey
}

/**
 * Verify the JWT token and validate the payloads shape
 * @param token
 */
async function verifyJWT(token: string): Promise<Payload> {
  const publicKey = await loadPublicKey()
  const { payload } = await jose.jwtVerify(token, publicKey, {
    issuer: process.env.JWT_ISSUER,
  })
  if (!isValidJWTPayload(payload)) {
    throw new JWTPayloadValidationError('Invalid JWT payload')
  }
  return payload
}

/**
 * Check if both the session cookie and the JWT are present.
 * If both are present, check if the JWT is valid and return the payload
 * @param req
 */
export async function parseAndVerifyJWT(
  req: NextRequest,
): Promise<Payload | null> {
  try {
    const sessionCookieString = req.cookies?.['connect.sid']
    const jwtCookieString = req.cookies?.['republik-token']

    console.log(
      'Cookie check',
      !sessionCookieString,
      !jwtCookieString,
      !sessionCookieString || !jwtCookieString,
    )

    // TODO: validate that both cookies have a max-age of >= now
    if (!sessionCookieString || !jwtCookieString) {
      return null
    }

    const payload = await verifyJWT(jwtCookieString)
    return payload
  } catch (error) {
    console.error(error)
    return null
  }
}
