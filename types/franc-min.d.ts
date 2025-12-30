declare module "franc-min" {
  export type FrancOptions = {
    only?: string[]
    ignore?: string[]
    minLength?: number
  }

  export function franc(value?: string, options?: FrancOptions): string
  export function francAll(
    value?: string,
    options?: FrancOptions
  ): Array<[string, number]>
}
