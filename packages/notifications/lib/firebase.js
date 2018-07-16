const firebase = require('firebase-admin')
const debug = require('debug')('notifications:publish:firebase')

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_DATABASE_URL
} = process.env

// singleton
firebase.initializeApp({
  credential: firebase.credential.cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY
      .replace(/@/g, '\n')
      .replace(/\\\s/g, ' ')
  }),
  databaseURL: FIREBASE_DATABASE_URL
})

const publish = async (args) => {
  const { tokens, title, body, url, icon, type } = args

  if (tokens.length > 0) {
    const message = {
      notification: {
        title,
        body
      },
      data: {
        url,
        type,
        ...icon
          ? { icon }
          : {}
      }
    }
    const result = await firebase.messaging().sendToDevice(
      tokens,
      message
    )
    debug('#recipients %d, message: %O, result: %O', tokens.length, message, result)
  } else {
    debug('no receipients found for publish: %O', args)
  }
}

module.exports = {
  publish
}
