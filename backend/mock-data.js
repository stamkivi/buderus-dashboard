/**
 * Mock data for demo mode
 */

// Generate realistic temperature data
function generateTemperature(base, variance) {
  return base + (Math.random() * variance * 2 - variance);
}

export function getMockStatus() {
  const now = new Date();
  const hour = now.getHours();

  // Simulate realistic temperature variations throughout the day
  const outdoorTemp = 5 + Math.sin((hour - 6) / 24 * 2 * Math.PI) * 3;
  const supplyTemp = 40 + Math.random() * 5;
  const returnTemp = supplyTemp - 5 - Math.random() * 2;
  const hotWaterTemp = 45 + Math.random() * 3;

  return {
    system: {
      brand: "BUDERUS",
      type: "Heat Pump",
      firmware: "06.03.01",
      hardware: "iCom_Low_NSC_v1",
      kmBuildNr: "6301"
    },
    temperatures: {
      outdoor: {
        id: "/system/sensors/temperatures/outdoor_t1",
        type: "floatValue",
        writeable: 0,
        recordable: 1,
        value: parseFloat(outdoorTemp.toFixed(1)),
        unitOfMeasure: "°C",
        minValue: -40,
        maxValue: 70
      },
      supply: {
        id: "/system/sensors/temperatures/supply_t1",
        type: "floatValue",
        writeable: 0,
        recordable: 1,
        value: parseFloat(supplyTemp.toFixed(1)),
        unitOfMeasure: "°C",
        minValue: 0,
        maxValue: 90
      },
      return: {
        id: "/system/sensors/temperatures/return",
        type: "floatValue",
        writeable: 0,
        recordable: 1,
        value: parseFloat(returnTemp.toFixed(1)),
        unitOfMeasure: "°C",
        minValue: 0,
        maxValue: 90
      },
      hotWater: {
        id: "/dhwCircuits/dhw1/actualTemp",
        type: "floatValue",
        writeable: 0,
        recordable: 1,
        value: parseFloat(hotWaterTemp.toFixed(1)),
        unitOfMeasure: "°C",
        minValue: 0,
        maxValue: 80
      }
    },
    timestamp: now.toISOString()
  };
}

export function generateMockHistoricalData(path, startTime, endTime) {
  const data = [];
  const start = startTime || Date.now() - (24 * 60 * 60 * 1000);
  const end = endTime || Date.now();
  const duration = end - start;
  const numPoints = Math.min(100, Math.max(10, duration / (5 * 60 * 1000))); // At least 10, max 100 points
  const interval = duration / numPoints;

  // Base temperatures for different sensors
  const baseTemps = {
    '/system/sensors/temperatures/outdoor_t1': { base: 5, variance: 4 },
    '/system/sensors/temperatures/supply_t1': { base: 42, variance: 3 },
    '/system/sensors/temperatures/return': { base: 37, variance: 2 },
    '/system/sensors/outdoorTemperatures/t1': { base: -2, variance: 3 },
    '/heatingCircuits/hc1/roomtemperature': { base: 21, variance: 1.5 },
    '/heatingCircuits/hc1/supplyTemperatureSetpoint': { base: 31, variance: 3 },
    '/heatingCircuits/hc2/roomtemperature': { base: 19, variance: 1.5 },
    '/heatingCircuits/hc2/supplyTemperatureSetpoint': { base: 45, variance: 3 },
    '/dhwCircuits/dhw1/actualTemp': { base: 44.5, variance: 2 },
    '/dhwCircuits/dhw1/setTemperature': { base: 43, variance: 0.5 },
  };

  const config = baseTemps[path] || { base: 20, variance: 5 };

  for (let i = 0; i < numPoints; i++) {
    const timestamp = start + i * interval;
    const hour = new Date(timestamp).getHours();

    // Add daily variation for outdoor temperature
    let value = config.base;
    if (path.includes('outdoor') || path.includes('Outdoor')) {
      value += Math.sin((hour - 6) / 24 * 2 * Math.PI) * 3;
    }

    // Add slight daily variation for room temperatures
    if (path.includes('roomtemperature')) {
      value += Math.sin((hour - 14) / 24 * 2 * Math.PI) * 0.8;
    }

    value += (Math.random() * config.variance * 2 - config.variance);

    data.push({
      timestamp: Math.floor(timestamp),
      value: parseFloat(value.toFixed(1)),
      unit: '°C'
    });
  }

  return data;
}
