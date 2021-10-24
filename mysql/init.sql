ALTER USER 'root' IDENTIFIED WITH mysql_native_password BY 'password';

CREATE DATABASE supportgroup;

USE supportgroup;

CREATE TABLE `chat_room` (
    `uuid` varchar(100) PRIMARY KEY,
    `category` varchar(100),
    `tokens` varchar(1000),
    `created_date` TIMESTAMP DEFAULT current_timestamp()
);

flush privileges;