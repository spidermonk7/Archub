import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import TopNav from './components/TopNav';
import HomePage from './pages/HomePage';
import GraphBuilder from './pages/GraphBuilder';
import TeamPool from './pages/TeamPool';
import AgentPool from './pages/AgentPool';
import RunTeam from './pages/RunTeam';
import GraphRunner from './pages/GraphRunner';
import PythonRunner from './pages/PythonRunner';
import ToolPool from './pages/ToolPool';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: '#7c3aed',
          borderRadius: 10,
          colorBgBase: '#000000',
          colorBgContainer: '#121212',
          colorText: '#ffffff',
          colorTextSecondary: '#bfbfbf',
          colorBorder: '#222222',
          controlOutline: '#7c3aed33',
        },
      }}
    >
      <Router>
        <div className="App">
          <div className="app-shell">
            <TopNav />
            <main className="page-body">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/builder" element={<GraphBuilder />} />
                <Route path="/team-pool" element={<TeamPool />} />
                <Route path="/agent-pool" element={<AgentPool />} />
                <Route path="/run-team" element={<RunTeam />} />
                <Route path="/runner" element={<GraphRunner />} />
                <Route path="/python-runner" element={<PythonRunner />} />
                <Route path="/tool-pool" element={<ToolPool />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ConfigProvider>
  );
};

export default App;
