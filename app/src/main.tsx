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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="browse-tasks" element={<BrowseTasks />} />
            <Route path="tasks/:taskId" element={<TaskDetail />} />
            <Route
              path="post-a-task"
              element={
                <RequireAuth>
                  <PostTask />
                </RequireAuth>
              }
            />
            <Route
              path="my-tasks"
              element={
                <RequireAuth>
                  <MyTasks />
                </RequireAuth>
              }
            />
            <Route path="for-professionals" element={<ComingSoon title="For Professionals" />} />
            <Route path="about" element={<ComingSoon title="About" />} />
            <Route path="contact" element={<ComingSoon title="Contact" />} />
            <Route path="faq" element={<ComingSoon title="FAQs" />} />
            <Route path="privacy-policy" element={<ComingSoon title="Privacy Policy" />} />
            <Route path="terms" element={<ComingSoon title="Terms of Service" />} />
            <Route path="verify" element={<ComingSoon title="Verify Credentials" />} />
            <Route path="login" element={<SignIn />} />
            <Route path="sign-up" element={<SignUp />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
