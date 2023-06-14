
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL UNIQUE,
    salt VARCHAR(64),
    hash VARCHAR(128)
);

CREATE TABLE IF NOT EXISTS userSettings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userID INTEGER REFERENCES users(id),
    retryScriptOnFailDefault INTEGER DEFAULT 1,
    maxScriptsRunningSimultaneously INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path VARCHAR(200) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(200) NOT NULL,
    parent INTEGER REFERENCES paths,
    isDirectory BOOLEAN, --- PATH or SCRIPT switch
    pureJSCode BOOLEAN,
    user INTEGER REFERENCES users,
    UNIQUE(path, user)
);

CREATE TABLE IF NOT EXISTS schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    options JSON, -- information about how often smth should be executed
    scriptID INTEGER REFERENCES paths
);

CREATE TABLE IF NOT EXISTS calendar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduleID INTEGER REFERENCES schedule,
    datetime timestamp -- the time of scheduled execution of some script
)
