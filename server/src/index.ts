import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { seedDatabase } from "./db/seed";
import { handleSocketConnections } from "./socket/handlers";
import { startSimulation } from "./simulation/engine";

// Routes
import vesselsRouter from "./routes/vessels";
import alertsRouter from "./routes/alerts";
import nodesRouter from "./routes/nodes";
import dronesRouter from "./routes/drones";
import statsRouter from "./routes/stats";
import settingsRouter from "./routes/settings";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

// Configure Middlewares
app.use(cors());
app.use(express.json());

// Set socketio reference on app
app.set("socketio", io);

// Initialize & Seed Database
seedDatabase();

// Root Status Route
app.get("/", (req, res) => {
  res.json({
    status: "ONLINE",
    service: "AQUA-SENTINEL SECURE MESH API",
    version: "2.4.0",
    uptime_seconds: Math.floor(process.uptime())
  });
});

// Setup Routes
app.use("/api/vessels", vesselsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/nodes", nodesRouter);
app.use("/api/drones", dronesRouter);
app.use("/api/stats", statsRouter);
app.use("/api/settings", settingsRouter);

// Set up socket.io connection logic
handleSocketConnections(io);

// Start Continuous Simulation
startSimulation(io);

// Start server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`AQUA-SENTINEL Server running on http://localhost:${PORT}`);
});
