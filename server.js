const fastify = require('fastify')({ logger: true })

const path = require('path')
const dotenv = require('dotenv').config()
const { Rabbit } = require('rabbit-queue');

fastify.register(require('fastify-postgres'), {
    connectionString: process.env.DATABASE_URL
})

fastify.post('/insights', async (req, reply) => {
    const actor = req.body.actor
    const page = req.body.object.id

    // replace user_id with insights_id
    const client = await fastify.pg.connect()
    // TODO: Check if we can keep a reference to the DB 
    const result = await client.query(
        'SELECT insights_id FROM users WHERE id = $1', [actor.account.id],
    )
    if (result.rowCount === 0) {
        const insights_id = await client.query(
            'INSERT INTO users (id) VALUES ($1) RETURNING insights_id', [actor.account.id],
        )
        req.body.actor.account.id = insights_id.rows[0].insights_id
    } else {
        req.body.actor.account.id = result.rows[0].insights_id
    }
    client.release()

    // replace id in url with 'ID'
    req.body.object.id = idCleanup(page)

    //add timestamp
    req.body.time = new Date();

    // send data to insights-engine service
    rabbit
        .publish('insights', req.body)
        .then(() => console.log('message will be published'));

    return { status: 'ok' }
})

fastify.options("/*", function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With')
    res.send(200)
});

// everything rabbitMQ
const rabbit = new Rabbit(process.env.RABBIT_URL || 'amqp://localhost', {
    prefetch: 1, // default prefetch from queue
    replyPattern: true, // if reply pattern is enabled an exclusive queue is created
    scheduledPublish: false,
    prefix: '', // prefix all queues with an application name
    socketOptions: {} // socketOptions will be passed as a second param to amqp.connect and from ther to the socket library (net or tls)
});

/**
 * replaces id occurences of given url.
 * may result in false positives if url slugs have a length of 24 characters
 * @param {string} url 
 */
function idCleanup(url) {
    const match = /\/[0-9a-f]{24}/g;
    if (url.match(match)) {
        return url.replace(match, '/ID')
    }
    return url;
}

const start = async () => {
    try {
        await fastify.listen(process.env.PORT, process.env.HOST)
        fastify.log.info(`server listening on ${fastify.server.address().port}`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
rabbit.on('disconnected', (err = new Error('Rabbitmq Disconnected')) => {
// handle disconnections and try to reconnect
console.error(err);
setTimeout(() => rabbit.reconnect(), 5000);
});
start()
