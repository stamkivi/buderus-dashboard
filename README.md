# Buderus Heat Pump Dashboard

A modern web dashboard for monitoring and controlling Buderus heat pumps via the KM200 gateway module.

![Dashboard](docs/screenshot-placeholder.png)

## Features

- 🌡️ **Real-time Temperature Monitoring** - Monitor all heating zones, hot water, and outdoor temperatures
- 📊 **Historical Graphs** - View temperature trends with customizable time periods (1h to 90d) and resolutions
- 🏠 **Multi-Zone Support** - Separate monitoring for 1st floor, 2nd floor, and hot water
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🔒 **Secure** - All data stored locally, no cloud dependencies
- ⚡ **Automatic Data Collection** - Polls KM200 every 5 minutes and stores 90 days of history

## Technology Stack

- **Frontend**: React + Vite + Tailwind CSS + Recharts
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Encryption**: AES-256-ECB for KM200 protocol

## Prerequisites

- Node.js 18+ and npm
- Buderus/Bosch heat pump with KM200 gateway module
- Local network access to KM200 device

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/buderus-dashboard.git
cd buderus-dashboard
```

### 2. Install dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure KM200 credentials

```bash
# Copy the example environment file
cd backend
cp .env.example .env

# Edit .env and add your KM200 credentials
nano .env
```

Required configuration in `.env`:
- `KM200_HOST` - IP address of your KM200 device (find via network scan)
- `KM200_GATEWAY_PASSWORD` - Password from device sticker (16 chars, **remove dashes**)
- `KM200_PRIVATE_PASSWORD` - App password created in Buderus/Bosch mobile app

**Important**: The gateway password on the sticker has dashes (e.g., `Ab3d-Ef2h-1jKl-mN5p`), but you must **remove them** when entering in `.env` (e.g., `Ab3dEf2h1jKlmN5p`).

### 4. Run the application

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend (in a new terminal)
cd frontend
npm run dev
```

The dashboard will be available at `http://localhost:5173`

## Finding Your KM200 Device

If you don't know your KM200's IP address, scan your network:

```bash
# Quick scan for KM200 on local network
for ip in 192.168.1.{1..254}; do
  timeout 1 curl -s http://$ip/gateway/uuid > /dev/null && echo "Found: $ip"
done
```

## API Endpoints

The backend exposes several API endpoints:

- `GET /api/status` - Current status of all zones
- `GET /api/history-aggregated?paths=<paths>&period=<period>&resolution=<resolution>` - Historical data
- `GET /api/km200/*` - Direct access to any KM200 endpoint
- `POST /api/km200/*` - Write values to KM200 endpoints

## Demo Mode

To run the dashboard without a real KM200 device (using mock data):

```bash
# Set DEMO_MODE=true in backend/.env
DEMO_MODE=true
```

## Data Collection

- Data is automatically collected **every 5 minutes**
- Stored locally in SQLite database (`backend/data.db`)
- Retention period: **90 days** (older data auto-deleted)
- No internet connection required

## Security Notes

- All credentials are stored in `.env` (not committed to git)
- Database contains only temperature readings, no personal data
- No cloud services or external APIs used
- Local network access only

## Troubleshooting

### "Missing required environment variables" error
- Make sure you've created `backend/.env` from `.env.example`
- Verify all required variables are set

### Connection errors to KM200
- Verify KM200 IP address is correct
- Ensure you removed dashes from gateway password
- Check KM200 is on same network as server
- Some KM200 devices close connections after multiple rapid requests (this is normal, retry will work)

### No historical data in graphs
- The system needs time to collect data (5 minute intervals)
- Check database: `sqlite3 backend/data.db "SELECT COUNT(*) FROM readings;"`

## License

MIT

## Acknowledgments

- KM200 protocol documentation from [web-km200](https://github.com/web-km200/web-km200)
- Encryption algorithm from Buderus/Bosch community reverse engineering efforts
