import {
  CustomEditor,
  CustomElement,
  NodeTemplate
} from '../../../custom-types'
import { config } from '../../elements'
import { Element as SlateElement, Text } from 'slate'
import { fixStructure } from '../helpers/structure'
import { handleEnds } from '../helpers/ends'
import { handlePlaceholders } from '../helpers/text'

export const withNormalizations = (topLevelStructure?: NodeTemplate[]) => (
  editor: CustomEditor
): CustomEditor => {
  const { normalizeNode } = editor
  editor.normalizeNode = ([node, path]) => {
    // console.log('normalize', { node, path })
    let rerun
    // top-level normalization
    if (path.length === 0) {
      // console.log('top level')
      rerun = fixStructure(topLevelStructure)(
        [node as CustomElement, path],
        editor
      )
      if (rerun) return
    }
    // element normalization
    if (SlateElement.isElement(node)) {
      const elConfig = config[node.type]
      rerun = fixStructure(elConfig.structure)([node, path], editor)
      if (rerun) return
      const customNormalizations = elConfig.normalizations || []
      customNormalizations.forEach(normalizeFn => {
        rerun = normalizeFn([node, path], editor)
        if (rerun) return
      })
    }
    // text normalization
    if (Text.isText(node)) {
      // console.log('text node')
      rerun = handleEnds([node, path], editor)
      if (rerun) return
      rerun = handlePlaceholders([node, path], editor)
      if (rerun) return
    }
    normalizeNode([node, path])
  }
  return editor
}
