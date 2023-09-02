import type { IStandaloneCodeEditor } from '@power-playground/core'
import type * as monacoEditor from 'monaco-editor'

import { asyncDebounce } from './asyncDebounce'

export type Provider<T> = (
  model: monacoEditor.editor.ITextModel,
  opts: { mountInitValue: T; isCancel: { value: boolean } },
) => Promise<() => void> | (() => void)

export function makeProvider<T>(
  mount: (
    editor: IStandaloneCodeEditor
  ) => T,
  clear: (
    editor: IStandaloneCodeEditor,
    mountInitValue: T
  ) => void,
  anytime?: () => void
) {
  return (
    editor: IStandaloneCodeEditor,
    selector: { languages: string[] },
    provider: Provider<T>
  ) => {
    const mountInitValue = mount(editor)

    const debounce = asyncDebounce()
    let isCancel = { value: false }
    let prevDispose: (() => void) | undefined = undefined

    async function callback() {
      anytime?.()
      const model = editor.getModel()
      if (!model) return

      if (!selector.languages.includes(model.getLanguageId())) {
        clear(editor, mountInitValue)
        return
      }
      try { await debounce(300) } catch { return }

      isCancel.value = true
      isCancel = { value: false }

      prevDispose?.()
      prevDispose = await provider(model, { mountInitValue, isCancel })
    }
    callback().catch(console.error)
    return [
      editor.onDidChangeModel(callback).dispose,
      editor.onDidChangeModelContent(callback).dispose,
      editor.onDidFocusEditorWidget(callback).dispose
    ].reduce((acc, cur) => () => (acc(), cur()), () => {
      clear(editor, mountInitValue)
      prevDispose?.()
    })
  }
}