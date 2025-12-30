function StatusIndicator({ connected }) {
  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-full">
      <div
        className={`w-2 h-2 rounded-full ${
          connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className="text-sm font-medium text-gray-700">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

export default StatusIndicator;
