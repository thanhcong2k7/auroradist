import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Discography from './pages/Discography';
import ReleaseForm from './pages/ReleaseForm';
import Artists from './pages/Artists';
import Labels from './pages/Labels';
import Tracks from './pages/Tracks';
import Analytics from './pages/Analytics';
import Wallet from './pages/Wallet';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/discography" element={<Discography />} />
          <Route path="/discography/new" element={<ReleaseForm />} />
          <Route path="/discography/edit/:id" element={<ReleaseForm />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/labels" element={<Labels />} />
          <Route path="/tracks" element={<Tracks />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;