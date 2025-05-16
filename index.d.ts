export class GraphQLError extends Error {
  constructor (message: string)
}

export interface Options {
  signal?: AbortSignal | null
}

export default function graphql (url: string, query: string, variables?: object, headers?: object, options?: Options): Promise<object>
