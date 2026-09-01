declare module 'abcjs' {
  export interface RenderParams {
    add_classes?: boolean
    paddingtop?: number
    paddingbottom?: number
    paddingleft?: number
    paddingright?: number
    staffwidth?: number
    [key: string]: unknown
  }

  export function renderAbc(
    target: HTMLElement | string,
    abc: string,
    params?: RenderParams,
  ): unknown[]

  const abcjs = { renderAbc }
  export default abcjs
}
