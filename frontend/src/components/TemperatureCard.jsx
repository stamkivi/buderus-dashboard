const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  orange: 'from-orange-500 to-orange-600',
  green: 'from-green-500 to-green-600',
  red: 'from-red-500 to-red-600',
};

function TemperatureCard({ title, value, unit = '°C', icon, color = 'blue' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`bg-gradient-to-br ${colorClasses[color]} p-2 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline space-x-2">
        {value !== null && value !== undefined ? (
          <>
            <span className="text-4xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toFixed(1) : value}
            </span>
            <span className="text-xl text-gray-500">{unit}</span>
          </>
        ) : (
          <span className="text-2xl text-gray-400">No data</span>
        )}
      </div>
    </div>
  );
}

export default TemperatureCard;
