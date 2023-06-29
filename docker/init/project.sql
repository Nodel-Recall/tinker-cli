CREATE TABLE project (
    name             VARCHAR(40)  NOT NULL CONSTRAINT only_chars CHECK (name ~ '^[a-zA-Z]+$'),
    ip               INET         NOT NULL,
    secret           VARCHAR(40)  NOT NULL,
    anon_jwt         VARCHAR(300) NOT NULL,
    service_role_jwt VARCHAR(300) NOT NULL
);