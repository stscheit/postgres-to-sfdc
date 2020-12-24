-- create table
CREATE TABLE Contacts (
	contact_id VARCHAR (18) PRIMARY KEY,
	status VARCHAR (16) NOT NULL
);

-- check contents
SELECT count(*) FROM contacts;
SELECT count(*) FROM contacts WHERE status = 'pending';
SELECT contact_id, status FROM contacts;
