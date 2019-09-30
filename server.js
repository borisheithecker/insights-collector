const fastify = require('fastify')({ logger: true })
const path = require('path')

fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'public'),
    prefix: '/public/',
})

fastify.register(require('fastify-postgres'), {
    connectionString: 'postgres://postgres@localhost/postgres'
})


fastify.get('/user/:id', async (req, reply) => {
    const client = await fastify.pg.connect()
    const { rows } = await client.query(
        'SELECT id, username, hash, salt FROM users WHERE id=$1', [req.params.id],
    )
    client.release()
    return rows
})

const start = async () => {
    try {
        await fastify.listen(3000)
        fastify.log.info(`server listening on ${fastify.server.address().port}`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }

}
start()
