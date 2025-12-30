import { useState } from 'react';
import ZoneGraph from './ZoneGraph';

const ConsolidatedGraph = () => {
  const [selectedZones, setSelectedZones] = useState(['hc1']);

  const zones = [
    {
      id: 'hc1',
      name: '1st Floor',
      tempPath: '/heatingCircuits/hc1/roomtemperature',
      detailPaths: [
        '/heatingCircuits/hc1/roomtemperature',
        '/heatingCircuits/hc1/supplyTemperatureSetpoint'
      ]
    },
    {
      id: 'hc2',
      name: '2nd Floor',
      tempPath: '/heatingCircuits/hc2/roomtemperature',
      detailPaths: [
        '/heatingCircuits/hc2/roomtemperature',
        '/heatingCircuits/hc2/supplyTemperatureSetpoint'
      ]
    },
    {
      id: 'water',
      name: 'Hot Water',
      tempPath: '/dhwCircuits/dhw1/actualTemp',
      detailPaths: [
        '/dhwCircuits/dhw1/actualTemp',
        '/dhwCircuits/dhw1/setTemperature'
      ]
    },
    {
      id: 'outdoor',
      name: 'Outdoor',
      tempPath: '/system/sensors/outdoorTemperatures/t1',
      detailPaths: '/system/sensors/outdoorTemperatures/t1'
    }
  ];

  const toggleZone = (zoneId) => {
    setSelectedZones(prev => {
      if (prev.includes(zoneId)) {
        // Don't allow deselecting if it's the only one selected
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== zoneId);
      } else {
        return [...prev, zoneId];
      }
    });
  };

  // Get paths to display
  const getPaths = () => {
    if (selectedZones.length === 1) {
      // Single zone: show detailed paths (temp + supply)
      const zone = zones.find(z => z.id === selectedZones[0]);
      return zone.detailPaths;
    } else {
      // Multiple zones: show only temperature paths
      return selectedZones.map(zoneId => {
        const zone = zones.find(z => z.id === zoneId);
        return zone.tempPath;
      });
    }
  };

  const getTitle = () => {
    if (selectedZones.length === 1) {
      const zone = zones.find(z => z.id === selectedZones[0]);
      return `${zone.name} Temperature`;
    } else {
      return 'Temperature Comparison';
    }
  };

  return (
    <div>
      {/* Zone Selector */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Select Zones:</label>
          <div className="flex gap-2 flex-wrap">
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => toggleZone(zone.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedZones.includes(zone.id)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {zone.name}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 ml-auto">
            {selectedZones.length === 1 ? 'Showing temp + supply' : 'Showing temperatures only'}
          </div>
        </div>
      </div>

      {/* Graph */}
      <ZoneGraph
        title={getTitle()}
        paths={getPaths()}
      />
    </div>
  );
};

export default ConsolidatedGraph;
