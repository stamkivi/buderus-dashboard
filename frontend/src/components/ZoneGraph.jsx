import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ZoneGraph = ({ title, paths, color = '#8884d8' }) => {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('24h');
  const [resolution, setResolution] = useState('hourly');
  const [loading, setLoading] = useState(true);

  const periods = [
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' }
  ];

  const resolutions = [
    { value: 'raw', label: 'Raw (5min)' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
  ];

  useEffect(() => {
    fetchData();
  }, [period, resolution, paths]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const pathsParam = Array.isArray(paths) ? paths.join(',') : paths;
      const response = await fetch(
        `http://localhost:3000/api/history-aggregated?paths=${encodeURIComponent(pathsParam)}&period=${period}&resolution=${resolution}`
      );
      const result = await response.json();

      // Transform data for recharts
      const pathList = Array.isArray(paths) ? paths : [paths];
      const allTimestamps = new Set();

      // Collect all unique timestamps
      pathList.forEach(path => {
        if (result[path]) {
          result[path].forEach(reading => {
            allTimestamps.add(reading.timestamp);
          });
        }
      });

      // Create data points for each timestamp
      const chartData = Array.from(allTimestamps)
        .sort((a, b) => a - b)
        .map(timestamp => {
          const point = { timestamp };

          pathList.forEach(path => {
            const reading = result[path]?.find(r => r.timestamp === timestamp);
            if (reading) {
              // Use a cleaner label for the path
              const label = getPathLabel(path);
              point[label] = reading.value;
            }
          });

          return point;
        });

      setData(chartData);
    } catch (error) {
      console.error('Error fetching graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPathLabel = (path) => {
    if (path.includes('hc1/roomtemperature')) return '1st Floor Room';
    if (path.includes('hc1/supplyTemperatureSetpoint')) return '1st Floor Supply';
    if (path.includes('hc2/roomtemperature')) return '2nd Floor Room';
    if (path.includes('hc2/supplyTemperatureSetpoint')) return '2nd Floor Supply';
    if (path.includes('dhw1/actualTemp')) return 'Actual Temp';
    if (path.includes('dhw1/setTemperature')) return 'Target Temp';
    if (path.includes('outdoorTemperatures')) return 'Outdoor';
    return path.split('/').pop();
  };

  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);

    if (period === '1h' || period === '6h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (period === '24h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit' });
    } else if (period === '7d') {
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getColors = () => {
    const pathList = Array.isArray(paths) ? paths : [paths];
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];
    return pathList.map((_, index) => colors[index % colors.length]);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>

        <div className="flex gap-4">
          {/* Period Selector */}
          <div>
            <label className="text-sm text-gray-600 mr-2">Period:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {periods.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Resolution Selector */}
          <div>
            <label className="text-sm text-gray-600 mr-2">Resolution:</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {resolutions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">No data available</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              style={{ fontSize: '12px' }}
              label={{ value: '°C', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
              formatter={(value) => [`${value.toFixed(1)}°C`]}
            />
            <Legend />
            {Array.isArray(paths) ? (
              paths.map((path, index) => {
                const label = getPathLabel(path);
                const colors = getColors();
                return (
                  <Line
                    key={path}
                    type="monotone"
                    dataKey={label}
                    stroke={colors[index]}
                    strokeWidth={2}
                    dot={false}
                    name={label}
                  />
                );
              })
            ) : (
              <Line
                type="monotone"
                dataKey={getPathLabel(paths)}
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default ZoneGraph;
