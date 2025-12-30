import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { KM200Client } from './km200-client.js';
import { getMockStatus, generateMockHistoricalData } from './mock-data.js';
import {
  initDatabase,
  insertReading,
  getReadings,
  getLatestReading,
  getAllPaths,
  getSetting,
  setSetting,
  cleanOldReadings
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'public')));
}

// KM200 Configuration from environment variables
const KM200_HOST = process.env.KM200_HOST;
const KM200_GATEWAY_PASSWORD = process.env.KM200_GATEWAY_PASSWORD;
const KM200_PRIVATE_PASSWORD = process.env.KM200_PRIVATE_PASSWORD || '';
const DEMO_MODE = process.env.DEMO_MODE === 'true' || false;

// Validate required environment variables
if (!DEMO_MODE && (!KM200_HOST || !KM200_GATEWAY_PASSWORD)) {
  console.error('❌ ERROR: Missing required environment variables!');
  console.error('Please set KM200_HOST and KM200_GATEWAY_PASSWORD in your .env file');
  console.error('Or set DEMO_MODE=true to run in demo mode');
  process.exit(1);
}

let km200Client = null;
let isConnected = false;

if (DEMO_MODE) {
  console.log('⚠️  DEMO MODE ENABLED - Using mock data');
}

/**
 * Initialize KM200 connection
 */
async function initKM200() {
  try {
    console.log(`Connecting to KM200 at ${KM200_HOST}...`);
    km200Client = new KM200Client(KM200_HOST, KM200_GATEWAY_PASSWORD, KM200_PRIVATE_PASSWORD);
    await km200Client.init();
    isConnected = true;
    console.log('KM200 connected successfully');
  } catch (error) {
    console.error('Failed to initialize KM200:', error.message);
    isConnected = false;
  }
}

// API Routes

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    km200Connected: isConnected,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get current status from KM200
 */
app.get('/api/status', async (req, res) => {
  try {
    // Use mock data in demo mode or when KM200 is not connected
    if (DEMO_MODE || !isConnected) {
      const mockStatus = getMockStatus();
      return res.json(mockStatus);
    }

    // Get key system values
    const [
      systemInfo,
      outdoorTemp,
      supplyTemp,
      roomTemp,
      roomTemp2,
      dhwTemp
    ] = await Promise.allSettled([
      km200Client.get('/system/appliance/type'),
      km200Client.get('/system/sensors/outdoorTemperatures/t1'),
      km200Client.get('/heatingCircuits/hc1/supplyTemperatureSetpoint'),
      km200Client.get('/heatingCircuits/hc1/roomtemperature'),
      km200Client.get('/heatingCircuits/hc2/roomtemperature'),
      km200Client.get('/dhwCircuits/dhw1/actualTemp')
    ]);

    const status = {
      system: systemInfo.status === 'fulfilled' ? systemInfo.value : null,
      temperatures: {
        outdoor: outdoorTemp.status === 'fulfilled' ? outdoorTemp.value : null,
        supply: supplyTemp.status === 'fulfilled' ? supplyTemp.value : null,
        room: roomTemp.status === 'fulfilled' ? roomTemp.value : null,
        room2: roomTemp2.status === 'fulfilled' ? roomTemp2.value : null,
        hotWater: dhwTemp.status === 'fulfilled' ? dhwTemp.value : null
      },
      timestamp: new Date().toISOString()
    };

    res.json(status);
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get data from any KM200 endpoint
 */
app.get('/api/km200/*', async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({ error: 'KM200 not connected' });
    }

    const path = '/' + req.params[0];
    const data = await km200Client.get(path);
    res.json(data);
  } catch (error) {
    console.error(`Error fetching ${req.params[0]}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Set data on KM200 endpoint
 */
app.post('/api/km200/*', async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({ error: 'KM200 not connected' });
    }

    const path = '/' + req.params[0];
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    await km200Client.set(path, value);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error setting ${req.params[0]}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get historical data for a specific path
 */
app.get('/api/history/:path(*)', async (req, res) => {
  try {
    const path = '/' + req.params.path;
    const { start, end } = req.query;

    const startTime = start ? parseInt(start) : Date.now() - (24 * 60 * 60 * 1000); // Default: last 24h
    const endTime = end ? parseInt(end) : Date.now();

    // Use mock data in demo mode or when no historical data exists
    if (DEMO_MODE) {
      const mockData = generateMockHistoricalData(path);
      return res.json(mockData);
    }

    const readings = await getReadings(path, startTime, endTime);

    // If no real data, return mock data
    if (readings.length === 0) {
      const mockData = generateMockHistoricalData(path);
      return res.json(mockData);
    }

    res.json(readings);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get aggregated historical data with time periods and resolutions
 */
app.get('/api/history-aggregated', async (req, res) => {
  try {
    const { paths, period = '24h', resolution = 'hourly' } = req.query;

    if (!paths) {
      return res.status(400).json({ error: 'paths parameter is required' });
    }

    const pathList = Array.isArray(paths) ? paths : paths.split(',');

    // Calculate time range based on period
    const now = Date.now();
    let startTime;

    switch(period) {
      case '1h':
        startTime = now - (1 * 60 * 60 * 1000);
        break;
      case '6h':
        startTime = now - (6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startTime = now - (90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (24 * 60 * 60 * 1000);
    }

    // Calculate aggregation interval based on resolution
    let intervalMs;
    switch(resolution) {
      case 'raw':
        intervalMs = 0; // No aggregation
        break;
      case 'hourly':
        intervalMs = 60 * 60 * 1000;
        break;
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        intervalMs = 60 * 60 * 1000;
    }

    const result = {};

    for (const path of pathList) {
      if (DEMO_MODE) {
        result[path] = generateMockHistoricalData(path, startTime, now);
      } else {
        const readings = await getReadings(path, startTime, now);

        if (readings.length === 0) {
          result[path] = generateMockHistoricalData(path, startTime, now);
        } else if (intervalMs === 0) {
          result[path] = readings;
        } else {
          // Aggregate data
          result[path] = aggregateReadings(readings, intervalMs);
        }
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching aggregated history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper function to aggregate readings
 */
function aggregateReadings(readings, intervalMs) {
  if (readings.length === 0) return [];

  const aggregated = [];
  let currentBucket = {
    timestamp: Math.floor(readings[0].timestamp / intervalMs) * intervalMs,
    values: [],
    unit: readings[0].unit
  };

  for (const reading of readings) {
    const bucketTime = Math.floor(reading.timestamp / intervalMs) * intervalMs;

    if (bucketTime === currentBucket.timestamp) {
      currentBucket.values.push(reading.value);
    } else {
      // Save current bucket
      if (currentBucket.values.length > 0) {
        aggregated.push({
          timestamp: currentBucket.timestamp,
          value: currentBucket.values.reduce((a, b) => a + b) / currentBucket.values.length,
          unit: currentBucket.unit
        });
      }

      // Start new bucket
      currentBucket = {
        timestamp: bucketTime,
        values: [reading.value],
        unit: reading.unit
      };
    }
  }

  // Save last bucket
  if (currentBucket.values.length > 0) {
    aggregated.push({
      timestamp: currentBucket.timestamp,
      value: currentBucket.values.reduce((a, b) => a + b) / currentBucket.values.length,
      unit: currentBucket.unit
    });
  }

  return aggregated;
}

/**
 * Get all monitored paths
 */
app.get('/api/paths', async (req, res) => {
  try {
    const paths = await getAllPaths();
    res.json(paths);
  } catch (error) {
    console.error('Error fetching paths:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update configuration
 */
app.post('/api/config', async (req, res) => {
  try {
    const { host, gatewayPassword, privatePassword } = req.body;

    if (host) await setSetting('km200_host', host);
    if (gatewayPassword) await setSetting('km200_gateway_password', gatewayPassword);
    if (privatePassword) await setSetting('km200_private_password', privatePassword);

    res.json({ success: true, message: 'Configuration updated. Restart required.' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Scheduled task to collect data every 5 minutes
 */
cron.schedule('*/5 * * * *', async () => {
  if (!isConnected) return;

  console.log('Collecting data...');

  try {
    // Define paths to monitor
    const monitorPaths = [
      // Outdoor temperature
      '/system/sensors/outdoorTemperatures/t1',
      // 1st floor (hc1)
      '/heatingCircuits/hc1/roomtemperature',
      '/heatingCircuits/hc1/supplyTemperatureSetpoint',
      // 2nd floor (hc2)
      '/heatingCircuits/hc2/roomtemperature',
      '/heatingCircuits/hc2/supplyTemperatureSetpoint',
      // Hot water boiler
      '/dhwCircuits/dhw1/actualTemp',
      '/dhwCircuits/dhw1/setTemperature'
    ];

    for (const path of monitorPaths) {
      try {
        const data = await km200Client.get(path);
        if (data && data.value !== undefined) {
          await insertReading(path, parseFloat(data.value), data.unitOfMeasure || '');
        }
      } catch (error) {
        console.error(`Failed to collect data for ${path}:`, error.message);
      }
    }

    console.log('Data collection completed');
  } catch (error) {
    console.error('Error during data collection:', error);
  }
});

/**
 * Clean old data daily at 3 AM
 */
cron.schedule('0 3 * * *', () => {
  console.log('Cleaning old data...');
  cleanOldReadings(90); // Keep 90 days
});

// Serve frontend app for all non-API routes (in production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });
}

// Start server
async function startServer() {
  try {
    // Initialize database
    await initDatabase();

    app.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);

      // Initialize KM200 connection
      if (KM200_PRIVATE_PASSWORD) {
        await initKM200();
      } else {
        console.warn('KM200_PRIVATE_PASSWORD not set. Please configure it to connect to KM200.');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
