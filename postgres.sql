-- create (default) session table
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- create table for data
CREATE TABLE Contacts (
	contact_id VARCHAR (18) PRIMARY KEY,
	status VARCHAR (16) NOT NULL
);

TRUNCATE TABLE Contacts;
TRUNCATE TABLE Session;

-- check contents
SELECT count(*) FROM contacts;
SELECT count(*) FROM contacts WHERE status = 'pending';
SELECT count(*) FROM contacts WHERE status = 'sent';
SELECT contact_id, status FROM contacts where contact_id = '0032800000T20esAAB';
