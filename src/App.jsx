import React, { useState, useEffect } from 'react';
import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './Screens/StudentDashBoard';
import SuccessScreen from './Screens/SuccessScreen';
import CancelScreen from './Screens/CancelScreen';
import AutoTranslate from './AutoTranslate';
import StudentPopup from './Components/Popup.jsx';
import BackDesignPopup from './Components/BackDesignPopup.jsx';
import BackTextPopup from './Components/BackTextPopup.jsx';
import StudentRegister from './Pages/StudentRegister.jsx';
import StudentLogin from './Pages/StudentLogin.jsx';
import { useAuth } from './context/AuthContext';
import useBackDesignStore from './store/backDesignStore';

function App() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState(() => localStorage.getItem('mode')); // null | 'individual' | 'batch'
  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem('students');
    return saved ? JSON.parse(saved) : [];
  }); // array of student names
  const [customizations, setCustomizations] = useState(() => {
    const saved = localStorage.getItem('studentCustomizations');
    return saved ? JSON.parse(saved) : {};
  }); // student-specific customizations
  const [showBackPopup, setShowBackPopup] = useState(false);
  const [showBackTextPopup, setShowBackTextPopup] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const { fetchBackDesigns, backDesigns } = useBackDesignStore();
  const getUser = localStorage.getItem('user');
  const userObj = getUser ? JSON.parse(getUser) : null;
  const getClassId = userObj?.class_id;

  useEffect(() => {
    if (getClassId) {
      fetchBackDesigns({ page: 1, limit: 100, class_id: getClassId });
    }
  }, [getClassId]);

  // Save mode to localStorage
  useEffect(() => {
    if (mode) {
      localStorage.setItem('mode', mode);
    } else {
      localStorage.removeItem('mode');
    }
  }, [mode]);

  // Save students to localStorage
  useEffect(() => {
    if (students && students.length > 0) {
      localStorage.setItem('students', JSON.stringify(students));
    }
  }, [students]);

  // Sync isAppReady from PlayCanvas
  useEffect(() => {
    const handleMessage = (event) => {
      if (typeof event.data === 'string' && event.data === 'app:ready') {
        console.log("App Ready signal received");
        setIsAppReady(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sync state between tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'students' && e.newValue) {
        try { setStudents(JSON.parse(e.newValue)); } catch { }
      }
      if (e.key === 'studentCustomizations' && e.newValue) {
        try { setCustomizations(JSON.parse(e.newValue)); } catch { }
      }
      if (e.key === 'mode' && e.newValue) {
        setMode(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleStudentSubmit = (finalMode) => {
    setMode(finalMode);
    // Removed automatic setShowBackPopup(true);
  };

  if (loading) return null; // Wait for auth initialization

  return (
    <>
      <AutoTranslate />
      {showBackPopup && (
        <BackDesignPopup
          students={students}
          customizations={customizations}
          setCustomizations={setCustomizations}
          onFinish={() => setShowBackPopup(false)}
          backDesigns={backDesigns}
        />
      )}
      {showBackTextPopup && (
        <BackTextPopup
          students={students}
          customizations={customizations}
          setCustomizations={setCustomizations}
          onFinish={() => setShowBackTextPopup(false)}
          isAppReady={isAppReady}
        />
      )}
      <Routes>
        <Route path="/" element={
          user ? (
            <>
              {mode === null ? (
                <StudentPopup
                  setMode={handleStudentSubmit}
                  setStudents={setStudents}
                />
              ) : (
                <StudentDashboard
                  mode={mode}
                  setMode={setMode}
                  students={students}
                  customizations={customizations}
                  setCustomizations={setCustomizations}
                  setShowBackPopup={setShowBackPopup}
                  setShowBackTextPopup={setShowBackTextPopup}
                />
              )}
            </>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        <Route path="/login" element={!user ? <StudentLogin /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!user ? <StudentRegister /> : <Navigate to="/" replace />} />
        <Route path="/payment-success" element={<SuccessScreen />} />
        <Route path="/payment-cancelled" element={<CancelScreen />} />
      </Routes>
    </>
  );
}

export default App;
