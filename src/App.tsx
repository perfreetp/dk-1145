import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { Dashboard, MapPage, Vendors, Applications, Inspections } from './pages';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}
