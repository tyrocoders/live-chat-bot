const { Client } = require("pg");


const ARRAY_SEPARATOR = '<=.*-=>';

class PGStore {
    constructor(label) {
        this.prefix = label.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        this.client = new Client({
            connectionString: process.env.DATABASE_URL
        });
        this.queryCreateMessageTableIfNeeded = `
            CREATE TABLE IF NOT EXISTS ${this.prefix}_message (
                payload          jsonb,
                received         timestamp with time zone,
                distribution     jsonb,

                message_id       uuid PRIMARY KEY,
                thread_id        uuid,

                sender_id        uuid,
                sender_label     text,
                recipient_ids    uuid[],
                recipient_labels text,

                attachment_ids   uuid[],

                ts_main          tsvector,
                ts_title         tsvector
            );`;

        this.queryCreateAttachmentTableIfNeeded = `
            CREATE TABLE IF NOT EXISTS ${this.prefix}_attachment (
                id           uuid PRIMARY KEY,
                data         bytea,
                type         text,
                name         text,
                message_id   uuid REFERENCES ${this.prefix}_message
            );`;

        this.queryAddMessage = `
            INSERT INTO ${this.prefix}_message (
                payload,
                received,
                distribution,
                message_id,
                thread_id,
                sender_id,
                sender_label,
                recipient_ids,
                recipient_labels,
                attachment_ids,
                ts_main,
                ts_title
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_tsvector($11), to_tsvector($12)
            )`;

        this.queryAddAttachment = `
            INSERT INTO ${this.prefix}_attachment (
                id,
                data,
                type,
                name,
                message_id
            ) VALUES (
                $1, $2, $3, $4, $5
            )`;

        this.queryGetAttachment = `
            SELECT data, type, name FROM ${this.prefix}_attachment WHERE id=$1`;

        this.queryBeginProtectedTransaction = `
            BEGIN;
            SELECT pg_advisory_xact_lock(42);`;

        this.queryEndProtectedTransaction = `
            COMMIT;`;
    }

    async initialize() {
        console.log('starting up db stuff');
        await this.client.connect();
        return [
            this.client.query(this.queryCreateMessageTableIfNeeded),
            this.client.query(this.queryCreateAttachmentTableIfNeeded)
        ];
    }

    async shutdown() {
        console.log('shutting down db stuff');
        await this.client.end();
        this.client = null;
    }

    async addMessage(entry) {
        const {
            payload,
            received,
            distribution,
            messageId,
            threadId,
            senderId,
            senderLabel,
            recipientIds,
            recipientLabels,
            attachmentIds,
            tsMain,
            tsTitle
        } = entry;

        const result = await this.client.query(this.queryAddMessage, [
            payload,
            received,
            distribution,
            messageId,
            threadId,
            senderId,
            senderLabel,
            recipientIds,
            recipientLabels && recipientLabels.join(ARRAY_SEPARATOR),
            attachmentIds,
            tsMain,
            tsTitle
        ]);
        if (result.rowCount !== 1)
            throw new Error("Failure in postgres message insert");
        
        return result;
    }

    async beginProtectedTransaction() {
        const result = await this.client.query(this.queryBeginProtectedTransaction);
        console.log('beginProtectedTransaction');
        if (result.length !== 2 || result[1].rowCount !== 1) throw new Error('Failure in postgres protected-transaction lock');
    }

    async endProtectedTransaction() {
        await this.client.query(this.queryEndProtectedTransaction);
        console.log('endProtectedTransaction');
    }

    async getMessages({ 
            limit, offset, 
            orderby='received', ascending='no', 
            until, since, 
            body, title,
            attachments,
            threadId,
            messageId,
            from, fromId,
            to, toId, needsOTS, hasOTS, confirmation,
            anyCorruption, chainCorruption, mainCorruption, 
            attachmentsCorruption, previousCorruption
        }) {

        const _selectfrom = `SELECT *, count(*) OVER() AS full_count FROM ${this.prefix}_message`;

        const _limit = limit ? `LIMIT ${limit}` : '';
        const _offset = offset ? `OFFSET ${offset}` : '';

        let predicates = [];
        if (until) predicates.push(`received <= '${until}'::timestamp with time zone`);
        if (since) predicates.push(`received >= '${since}'::timestamp with time zone`);
        if (body) predicates.push(`ts_main @@ plainto_tsquery('${body}')`);
        if (title) predicates.push(`ts_title @@ plainto_tsquery('${title}')`);
        if (threadId) predicates.push(`thread_id = '${threadId}'`);
        if (messageId) predicates.push(`message_id = '${messageId}'`);
        if (from) predicates.push(`sender_label ILIKE '%${from}%'`);
        if (fromId) predicates.push(`sender_id = '${fromId}'`);
        if (to) predicates.push(`recipient_labels ILIKE '%${to}%'`);
        if (toId) predicates.push(`recipient_ids @> ARRAY['${toId}'::uuid]`);
        if (attachments === 'yes') predicates.push('array_length(attachment_ids, 1) > 0');
        if (attachments === 'no') predicates.push(`attachment_ids = '{}'`);
        const _where = (predicates.length) ? `WHERE ${predicates.join(' AND ')}` : '';

        const _orderby = orderby ? `ORDER BY ${orderby} ${ascending === 'yes' ? 'ASC' : 'DESC'}` : '';

        const query = `${_selectfrom} ${_where} ${_orderby} ${_limit} ${_offset};`;

        console.log('Message query:', query);
        const result = await this.client.query(query);
        
        return result.rows.map(row => {
            return {
                payload: row.payload,
                received: row.received,
                distribution: row.distribution,
                messageId: row.message_id,
                threadId: row.thread_id,
                senderLabel: row.sender_label,
                senderId: row.sender_id,
                recipientLabels: row.recipient_labels.split(ARRAY_SEPARATOR),
                recipientIds: row.recipient_ids,
                attachmentIds: row.attachment_ids,
                fullCount: row.full_count
            };
        });
    }

    async addAttachment(entry) {
        const { id, data, type, name, messageId } = entry;

        const result = await this.client.query(this.queryAddAttachment, [
            id,
            data,
            type,
            name,
            messageId
        ]);
        if (result.rowCount !== 1)
            throw new Error("Failure in postgres attachment insert");

        return result;
    }

    async getAttachment(id) {
        const result = await this.client.query(this.queryGetAttachment, [id]);
        if (result.rowCount !== 1)
            throw new Error("Failure in postgres attachment retrieval");

        return result.rows[0];
    }
}

module.exports = PGStore;
