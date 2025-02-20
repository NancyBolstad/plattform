const { getRepoId } = require('./resolve')

// mean German, see http://iovs.arvojournals.org/article.aspx?articleid=2166061
const WORDS_PER_MIN = 180

const { SUPPRESS_READING_MINUTES } = process.env

let suppressReadingMinutes

try {
  suppressReadingMinutes =
    SUPPRESS_READING_MINUTES && JSON.parse(SUPPRESS_READING_MINUTES)

  if (suppressReadingMinutes) {
    console.warn(
      'WARNING: Suppressing Document.meta.estimatedReadingMinutes with %O',
      suppressReadingMinutes,
    )
  }
} catch (e) {
  console.error('SUPPRESS_READING_MINUTES config parse error', e)
}

/**
 * Builds and an audioSource object from {doc.content.meta} for use in meta.
 * Publish uses packages/publikator/lib/Document.prepareMetaForPublish instead
 *
 * @param  {Object}      doc An MDAST tree
 * @return {Object|null}     e.g. { mp3: true, aac: null, ogg: null }
 */
const getAudioSource = (doc) => {
  // after publish
  if (doc.meta && doc.meta.audioSource) {
    return doc.meta.audioSource
  }
  // before published - render in publikator (preview)
  const { audioSourceKind, audioSourceMp3, audioSourceAac, audioSourceOgg } =
    doc.content.meta
  const audioSource =
    audioSourceMp3 || audioSourceAac || audioSourceOgg
      ? {
          kind: audioSourceKind,
          mp3: audioSourceMp3,
          aac: audioSourceAac,
          ogg: audioSourceOgg,
        }
      : null

  return audioSource
}

/**
 * Getter of WORDS_PER_MINUTE
 *
 * @return {Number} Returns word count one might be able to read
 */
const getWordsPerMinute = () => WORDS_PER_MIN

/**
 * Returns an estimated amount of minutes, describing how much time a proficient
 * reader needs to invest to read this article.
 *
 * @param  {Object}      doc An MDAST tree
 * @return {Number}      Minutes to read content
 */
const getEstimatedReadingMinutes = (doc) => {
  const count =
    (doc._storedFields && doc._storedFields['contentString.count']) || false
  if (count && count[0] > getWordsPerMinute()) {
    return Math.round(count[0] / getWordsPerMinute())
  }
  return null
}

const isReadingMinutesSuppressed = (fields, resolvedFields) =>
  suppressReadingMinutes &&
  // Paths
  ((fields.path &&
    suppressReadingMinutes.paths &&
    suppressReadingMinutes.paths.includes(fields.path)) ||
    // Series
    (resolvedFields.series &&
      resolvedFields.series.title &&
      suppressReadingMinutes.series &&
      suppressReadingMinutes.series.includes(resolvedFields.series.title)) ||
    // Formats
    (resolvedFields.format &&
      resolvedFields.format.meta &&
      resolvedFields.format.meta.repoId &&
      suppressReadingMinutes.formats &&
      suppressReadingMinutes.formats.includes(
        resolvedFields.format.meta.repoId,
      )))

const getEstimatedConsumptionMinutes = (doc, estimatedReadingMinutes) => {
  const durationMs = doc.meta?.audioSource?.durationMs
  const kind = doc.meta?.audioSource?.kind

  // Return audio duration in minutes if audioSource provides duration in ms and
  // audioSource.kind is neither "readAloud" or "syntheticReadAloud". As their an
  // audio representation of written content, these should not be counted towards
  // consumption time.
  const audioDurationMinutes =
    !!durationMs &&
    !['readAloud', 'syntheticReadAloud'].includes(kind) &&
    Math.round(durationMs / (1000 * 60))

  return Math.max(audioDurationMinutes, estimatedReadingMinutes)
}

// _meta is present on unpublished docs
// { repo { publication { commit { document } } } }
const getRepoIdsForDoc = (doc, includeParents) =>
  [
    doc.meta?.repoId || doc._meta?.repoId,
    includeParents && getRepoId(doc.meta?.format || doc._meta?.format).repoId,
  ].filter(Boolean)

const getTemplate = (doc) => doc.meta?.template || doc._meta?.template

module.exports = {
  getAudioSource,
  getEstimatedReadingMinutes,
  isReadingMinutesSuppressed,
  getEstimatedConsumptionMinutes,

  getWordsPerMinute,
  getRepoIdsForDoc,
  getTemplate,
}
