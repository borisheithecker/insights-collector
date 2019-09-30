//DATABASE_URL=postgres://username:pw@url:port/databasename npm run migrate up

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.createExtension('uuid-ossp', { ifNotExists: true });

    pgm.createTable('users', {
        id: { type: 'varchar(24)' },
        insights_id: {
            type: 'uuid',
            notNull: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        createdAt: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    });

    pgm.createIndex('users', 'id');
};


