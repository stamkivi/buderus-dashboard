import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import ZoneGraph from '../components/ZoneGraph';

const SensorDetail = () => {
  const { sensorId } = useParams();
  const navigate = useNavigate();
  const [rawData, setRawData] = useState({});
  const [loading, setLoading] = useState(true);

  const sensorConfigs = {
    hc1: {
      title: '1st Floor Heating Circuit',
      paths: [
        '/heatingCircuits/hc1/roomtemperature',
        '/heatingCircuits/hc1/supplyTemperatureSetpoint',
        '/heatingCircuits/hc1/operationMode',
        '/heatingCircuits/hc1/activeSwitchProgram',
        '/heatingCircuits/hc1/status',
        '/heatingCircuits/hc1/temperatureLevels/normal',
        '/heatingCircuits/hc1/temperatureLevels/exception'
      ],
      graphPaths: [
        '/heatingCircuits/hc1/roomtemperature',
        '/heatingCircuits/hc1/supplyTemperatureSetpoint'
      ]
    },
    hc2: {
      title: '2nd Floor Heating Circuit',
      paths: [
        '/heatingCircuits/hc2/roomtemperature',
        '/heatingCircuits/hc2/supplyTemperatureSetpoint',
        '/heatingCircuits/hc2/operationMode',
        '/heatingCircuits/hc2/activeSwitchProgram',
        '/heatingCircuits/hc2/status',
        '/heatingCircuits/hc2/temperatureLevels/normal',
        '/heatingCircuits/hc2/temperatureLevels/exception'
      ],
      graphPaths: [
        '/heatingCircuits/hc2/roomtemperature',
        '/heatingCircuits/hc2/supplyTemperatureSetpoint'
      ]
    },
    water: {
      title: 'Hot Water Circuit',
      paths: [
        '/dhwCircuits/dhw1/actualTemp',
        '/dhwCircuits/dhw1/setTemperature',
        '/dhwCircuits/dhw1/operationMode',
        '/dhwCircuits/dhw1/status'
      ],
      graphPaths: [
        '/dhwCircuits/dhw1/actualTemp',
        '/dhwCircuits/dhw1/setTemperature'
      ]
    },
    outdoor: {
      title: 'Outdoor Temperature',
      paths: [
        '/system/sensors/outdoorTemperatures/t1',
        '/system/appliance/type',
        '/system/brand'
      ],
      graphPaths: '/system/sensors/outdoorTemperatures/t1'
    }
  };

  const config = sensorConfigs[sensorId];

  useEffect(() => {
    if (config) {
      fetchRawData();
    }
  }, [sensorId]);

  const fetchRawData = async () => {
    setLoading(true);
    const data = {};

    for (const path of config.paths) {
      try {
        const response = await fetch(`http://localhost:3000/api/km200${path}`);
        const result = await response.json();
        data[path] = result;
      } catch (error) {
        console.error(`Error fetching ${path}:`, error);
        data[path] = { error: error.message };
      }
    }

    setRawData(data);
    setLoading(false);
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sensor not found</h1>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
                <p className="text-sm text-gray-500">Detailed sensor information</p>
              </div>
            </div>
            <button
              onClick={fetchRawData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Temperature Graph */}
        <div className="mb-8">
          <ZoneGraph
            title={`${config.title} - Historical Data`}
            paths={config.graphPaths}
          />
        </div>

        {/* Raw API Data */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Raw API Data</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {config.paths.map(path => (
                <div key={path} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-mono text-sm text-gray-600">{path}</h3>
                    {rawData[path]?.writeable === 1 && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Writable
                      </span>
                    )}
                  </div>
                  <pre className="bg-gray-50 rounded p-3 overflow-x-auto text-xs">
                    {JSON.stringify(rawData[path], null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">API Endpoints</h3>
          <p className="text-sm text-blue-800 mb-2">
            You can access any KM200 endpoint directly:
          </p>
          <code className="block bg-white px-3 py-2 rounded text-xs font-mono">
            GET http://localhost:3000/api/km200/[path]
          </code>
          <p className="text-sm text-blue-800 mt-2">
            For writable endpoints, you can use:
          </p>
          <code className="block bg-white px-3 py-2 rounded text-xs font-mono">
            POST http://localhost:3000/api/km200/[path]
            <br />
            Body: {`{ "value": <new_value> }`}
          </code>
        </div>
      </main>
    </div>
  );
};

export default SensorDetail;
