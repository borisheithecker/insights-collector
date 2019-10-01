// todo:
// change databasename

const fastify = require('fastify')({ logger: true })
const path = require('path')
const dotenv = require('dotenv').config()

fastify.register(require('fastify-postgres'), {
    // TODO: This should go in a config / env 
    connectionString: process.env.DATABASE_URL
})

fastify.get('/user/:id', async (req, reply) => {
    const client = await fastify.pg.connect()
    // TODO: Check if we can keep a reference to the DB 
    const result = await client.query(
        'SELECT insights_id FROM insights.public.users WHERE id = $1', [req.params.id],
    )
    if(result.rowCount === 0){
        const insights_id = await client.query(
            'INSERT INTO insights.public.users (id) VALUES ($1) RETURNING insights_id', [req.params.id],
        )
        client.release()
        return insights_id.rows[0]
    }else{
        client.release()
        return result.rows[0]
    }
})

const getUUIDfromDB = async (id) =>{
    try {
        const client = await fastify.pg.connect()
        const result = await client.query(
            'SELECT insights_id FROM insights.public.users WHERE id = $1', [id],
        )
        client.release();
        fastify.log.info(result)
        return result
    } catch (err) {
        fastify.log.error(err)
    }
}

const start = async () => {
    try {
        await fastify.listen(process.env.PORT)
        fastify.log.info(`server listening on ${fastify.server.address().port}`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }

}
start()
//getUUIDfromDB()
