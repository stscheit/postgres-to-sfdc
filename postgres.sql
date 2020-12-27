-- create table
CREATE TABLE Contacts (
	contact_id VARCHAR (18) PRIMARY KEY,
	status VARCHAR (16) NOT NULL
);

-- check contents
SELECT count(*) FROM contacts;
SELECT count(*) FROM contacts WHERE status = 'pending';
SELECT contact_id, status FROM contacts;


UPDATE contacts SET status='pending' WHERE contact_id In('0032800000T0p5aAAB','0034a000005vEXsAAM');
