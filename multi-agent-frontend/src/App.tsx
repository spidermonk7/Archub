import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import HomePage from './pages/HomePage';
import GraphBuilder from './pages/GraphBuilder';
import TeamPool from './pages/TeamPool';
import AgentPool from './pages/AgentPool';
import RunTeam from './pages/RunTeam';
import GraphRunner from './pages/GraphRunner';
import PythonRunner from './pages/PythonRunner';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/builder" element={<GraphBuilder />} />
            <Route path="/team-pool" element={<TeamPool />} />
            <Route path="/agent-pool" element={<AgentPool />} />
            <Route path="/run-team" element={<RunTeam />} />
            <Route path="/runner" element={<GraphRunner />} />
            <Route path="/python-runner" element={<PythonRunner />} />
          </Routes>
        </div>
      </Router>
    </ConfigProvider>
  );
};

export default App;
