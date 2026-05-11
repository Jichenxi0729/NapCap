import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import SearchPage from './pages/Search';
import MediaDetails from './pages/MediaDetails';
import ImportPage from './pages/Import';
import Profile from './pages/Profile';
import DataMigration from './components/DataMigration';
import Login from './pages/Login';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="media/:id" element={<MediaDetails />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="migrate" element={<DataMigration />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;