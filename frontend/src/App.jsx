import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SensorDetail from './pages/SensorDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sensor/:sensorId" element={<SensorDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
