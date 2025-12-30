import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Thermometer, Droplets, Settings, RefreshCw, Home } from 'lucide-react';
import TemperatureCard from '../components/TemperatureCard';
import ConsolidatedGraph from '../components/ConsolidatedGraph';
import StatusIndicator from '../components/StatusIndicator';

const API_BASE = '/api';

function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/status`)
      ]);

      if (!healthRes.ok || !statusRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const healthData = await healthRes.json();
      const statusData = await statusRes.json();

      setHealth(healthData);
      setStatus(statusData);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTemperatureValue = (tempData) => {
    if (!tempData || tempData.value === undefined) return null;
    return tempData.value;
  };

  const getTemperatureUnit = (tempData) => {
    if (!tempData || !tempData.unitOfMeasure) return '°C';
    return tempData.unitOfMeasure;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                <Thermometer className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Buderus Dashboard</h1>
                <p className="text-sm text-gray-500">Heat Pump Monitoring & Control</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <StatusIndicator connected={health?.km200Connected} />
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading && !status ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Temperature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div onClick={() => navigate('/sensor/hc1')} className="cursor-pointer transform hover:scale-105 transition-transform">
                <TemperatureCard
                  title="1st Floor"
                  value={getTemperatureValue(status?.temperatures?.room)}
                  unit={getTemperatureUnit(status?.temperatures?.room)}
                  icon={<Home className="w-5 h-5" />}
                  color="green"
                />
              </div>
              <div onClick={() => navigate('/sensor/hc2')} className="cursor-pointer transform hover:scale-105 transition-transform">
                <TemperatureCard
                  title="2nd Floor"
                  value={getTemperatureValue(status?.temperatures?.room2)}
                  unit={getTemperatureUnit(status?.temperatures?.room2)}
                  icon={<Home className="w-5 h-5" />}
                  color="purple"
                />
              </div>
              <div onClick={() => navigate('/sensor/water')} className="cursor-pointer transform hover:scale-105 transition-transform">
                <TemperatureCard
                  title="Hot Water"
                  value={getTemperatureValue(status?.temperatures?.hotWater)}
                  unit={getTemperatureUnit(status?.temperatures?.hotWater)}
                  icon={<Droplets className="w-5 h-5" />}
                  color="red"
                />
              </div>
              <div onClick={() => navigate('/sensor/outdoor')} className="cursor-pointer transform hover:scale-105 transition-transform">
                <TemperatureCard
                  title="Outdoor"
                  value={getTemperatureValue(status?.temperatures?.outdoor)}
                  unit={getTemperatureUnit(status?.temperatures?.outdoor)}
                  icon={<Thermometer className="w-5 h-5" />}
                  color="blue"
                />
              </div>
            </div>

            {/* Consolidated Temperature Graph */}
            <ConsolidatedGraph />

            {/* System Info */}
            {status?.system && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
                <div className="flex items-center space-x-2 mb-4">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(status.system).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500 capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
