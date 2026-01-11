import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// --- Database Models ---
const SensorSchema = new mongoose.Schema({
  id: String,
  lat: Number,
  lng: Number,
  name: String,
  status: { type: String, default: 'active' }
});
const Sensor = mongoose.model('Sensor', SensorSchema);

const ReadingSchema = new mongoose.Schema({
  sensorId: String,
  pm25: Number,
  pm10: Number,
  timestamp: { type: Date, default: Date.now }
});
const Reading = mongoose.model('Reading', ReadingSchema);

const ReportSchema = new mongoose.Schema({
  type: String,
  lat: Number,
  lng: Number,
  description: String,
  status: { type: String, default: 'Pending' },
  timestamp: { type: Date, default: Date.now }
});
const Report = mongoose.model('Report', ReportSchema);

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String }
});
const User = mongoose.model('User', UserSchema);

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Routes ---

// Get all sensors (and their latest reading if possible - simplified for now)
app.get('/api/sensors', async (req, res) => {
  try {
    const sensors = await Sensor.find();
    res.json(sensors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ingest Sensor Data
app.post('/api/sensors/data', async (req, res) => {
  try {
    const { sensorId, pm25, pm10, lat, lng } = req.body;
    
    // Save reading (if DB is connected)
    try {
      const reading = new Reading({ sensorId, pm25, pm10 });
      await reading.save();
    } catch (dbErr) {
      console.warn("DB Save failed (simulating only):", dbErr.message);
    }

    // Check for high dust alert
    if (pm25 > 100) {
      const alert = {
        sensorId,
        level: pm25 > 200 ? 'CRITICAL' : 'WARNING',
        pm25,
        lat,
        lng,
        message: `High dust detected at sensor ${sensorId}!`
      };
      io.emit('new-alert', alert); // Real-time alert to frontend
    }

    // Update live feed
    io.emit('sensor-update', { sensorId, pm25, pm10, lat, lng, type: req.body.type, name: req.body.name });

    res.status(201).send('Data received');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/reports', async (req, res) => {
  const reports = await Report.find().sort({ timestamp: -1 });
  res.json(reports);
});

// Get 24-hour sensor history for graph
app.get('/api/sensors/history', async (req, res) => {
  try {
    const { sensorId } = req.query;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    let query = { timestamp: { $gte: twentyFourHoursAgo } };
    if (sensorId) {
      query.sensorId = sensorId;
    }
    
    const readings = await Reading.find(query)
      .sort({ timestamp: 1 })
      .limit(1000); // Limit to prevent too much data
    
    // Group by hour for smoother graph
    const hourlyData = {};
    readings.forEach(reading => {
      const hour = new Date(reading.timestamp).setMinutes(0, 0, 0);
      if (!hourlyData[hour]) {
        hourlyData[hour] = { pm25: [], pm10: [], count: 0 };
      }
      hourlyData[hour].pm25.push(reading.pm25);
      hourlyData[hour].pm10.push(reading.pm10);
      hourlyData[hour].count++;
    });
    
    // Calculate averages per hour
    const graphData = Object.keys(hourlyData).map(hour => ({
      timestamp: new Date(parseInt(hour)),
      pm25: hourlyData[hour].pm25.reduce((a, b) => a + b, 0) / hourlyData[hour].count,
      pm10: hourlyData[hour].pm10.reduce((a, b) => a + b, 0) / hourlyData[hour].count
    }));
    
    res.json(graphData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports', async (req, res) => {
  const newReport = new Report(req.body);
  await newReport.save();
  io.emit('new-report', newReport);
  res.json(newReport);
});

// --- MongoDB Connection ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hacknova');
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    // Retry logic could go here, but for now we just log
  }
};
connectDB();

// --- Start Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

