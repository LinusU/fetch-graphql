import { createServer } from 'http'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'

import graphql, { GraphQLError } from './index.js'

async function startTestServer (responder) {
  const server = createServer(responder)
  server.listen(0)
  await once(server, 'listening')
  const { port } = server.address()
  const url = `http://localhost:${port}/graphql`
  return { server, url }
}

test('successful GraphQL response', async (t) => {
  const { server, url } = await startTestServer((_, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      data: { hello: 'world' }
    }))
  })

  t.after(() => server.close())

  const result = await graphql(url, '{ hello }')
  assert.deepEqual(result, { hello: 'world' })
})

test('HTTP error', async (t) => {
  const { server, url } = await startTestServer((_, res) => {
    res.writeHead(500)
    res.end('Internal Server Error')
  })

  t.after(() => server.close())

  await assert.rejects(() => graphql(url, '{ hello }'), (err) => {
    assert.equal(err.name, 'Error')
    assert.match(err.message, /GraphQL query failed with status 500/)
    return true
  })
})

test('GraphQL error response', async (t) => {
  const { server, url } = await startTestServer((_, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      data: null,
      errors: [
        {
          message: 'Field "hello" not found',
          locations: [{ line: 1, column: 3 }],
          path: ['hello']
        }
      ]
    }))
  })

  t.after(() => server.close())

  await assert.rejects(() => graphql(url, '{ hello }'), (err) => {
    assert(err instanceof GraphQLError)
    assert.equal(err.message, 'Field "hello" not found')
    assert.deepEqual(err.path, ['hello'])
    return true
  })
})

test('GraphQL partial data with errors', async (t) => {
  const { server, url } = await startTestServer((_, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      data: { user: null },
      errors: [
        { message: 'User not found' }
      ]
    }))
  })

  t.after(() => server.close())

  await assert.rejects(() => graphql(url, '{ user { name } }'), (err) => {
    assert(err instanceof GraphQLError || err instanceof AggregateError)
    assert.deepEqual(err.data, { user: null })
    return true
  })
})
