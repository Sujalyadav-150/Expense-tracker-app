const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const app = require("./app");
const { connectDB } = require("./config/database");

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

(async () => {
	try {
		await connectDB();
		app.listen(PORT, HOST, () => console.log(`Backend listening on ${HOST}:${PORT}`));
	} catch (error) {
		console.error(`Backend startup failed: ${error.message}`);
		process.exitCode = 1;
	}
})();
