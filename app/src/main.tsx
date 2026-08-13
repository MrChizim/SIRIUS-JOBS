import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { AuthProvider } from './lib/AuthContext';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import ComingSoon from './components/ComingSoon';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import PostTask from './pages/PostTask';
import BrowseTasks from './pages/BrowseTasks';
import TaskDetail from './pages/TaskDetail';
import MyTasks from './pages/MyTasks';
import Settings from './pages/Settings';
import PublicProfile from './pages/PublicProfile';
import AdminBadges from './pages/AdminBadges';
import AdminDisputes from './pages/AdminDisputes';
import About from './pages/About';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="browse-tasks" element={<BrowseTasks />} />
            <Route path="tasks/:taskId" element={<TaskDetail />} />
            <Route path="post-a-task" element={<PostTask />} />
            <Route
              path="my-tasks"
              element={
                <RequireAuth>
                  <MyTasks />
                </RequireAuth>
              }
            />
            <Route
              path="settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
            <Route path="for-professionals" element={<ComingSoon title="For Professionals" />} />
            <Route path="users/:userId" element={<PublicProfile />} />
            <Route
              path="admin/badges"
              element={
                <RequireAuth>
                  <AdminBadges />
                </RequireAuth>
              }
            />
            <Route
              path="admin/disputes"
              element={
                <RequireAuth>
                  <AdminDisputes />
                </RequireAuth>
              }
            />
            <Route path="about" element={<About />} />
            <Route path="login" element={<SignIn />} />
            <Route path="sign-up" element={<SignUp />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
