const mysql = require("mysql");
const configs = require("./configs");

class Database {
	constructor() {
		this.connection = null;
	}

	Connect() {
		this.connection = mysql.createConnection(configs.databaseOptions);

		this.connection.connect(function (err) {
			if (err) throw err;
			console.log("mysql Connected!");
		});
	}

	/* Format chatRoom 
    {
        uuid,
        category: string,
        tokens: string,
    }
    */
	NewChatRoom(chatRoom) {
		const query = this.connection.query(
			"INSERT INTO chat_room SET ?",
			chatRoom,
			function (error, results, fields) {
				if (error) throw error;
				console.log(results, fields);
			}
		);
		return query;
	}
}

module.exports = new Database();
