const dotenv = require("dotenv").config();

if (dotenv.error) {
	throw dotenv.error;
}
process.env.NODE_ENV = process.env.NODE_ENV || "development";

module.exports = {
	port: process.env.PORT || parseInt(process.env.PORT, 10) || 3000,
	databaseOptions: {
		host: process.env.DATABASE_URL,
		user: process.env.DATABASE_USER,
		password: process.env.DATABASE_PASSWORD,
		database: process.env.DATABASE_NAME,
		port: process.env.DATABASE_PORT,
	},
};
