import React, { useState, useEffect } from 'react';
import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './Screens/StudentDashBoard';
import SuccessScreen from './Screens/SuccessScreen';
import CancelScreen from './Screens/CancelScreen';
import AutoTranslate from './AutoTranslate';
import StudentPopup from './Components/Popup.jsx';
import BackDesignPopup from './Components/BackDesignPopup.jsx';
// import BackTextPopup from './Components/BackTextPopup.jsx'; // COMMENTED: Back text feature disabled
import StudentRegister from './Pages/StudentRegister.jsx';
import StudentLogin from './Pages/StudentLogin.jsx';
import { useAuth } from './context/AuthContext';
import useBackDesignStore from './store/backDesignStore';
import { getMyOrder, getMyOrderHistory, getMyClassBackDesigns } from './api/api';

function App() {
  const { user, loading } = useAuth();
  // State is simplified. Students array and Mode states removed.
  const [customizations, setCustomizations] = useState(() => {
    const saved = localStorage.getItem('studentCustomizations');
    return saved ? JSON.parse(saved) : {};
  }); // student-specific customizations
  const [showBackPopup, setShowBackPopup] = useState(false);
  const [students, setStudents] = useState([]);
  // const [showBackTextPopup, setShowBackTextPopup] = useState(false); // COMMENTED: Back text feature disabled
  const [isAppReady, setIsAppReady] = useState(false);
  const { fetchBackDesigns, backDesigns } = useBackDesignStore();
  const getUser = localStorage.getItem('user');
  const userObj = getUser ? JSON.parse(getUser) : null;
  const getClassId = userObj?.class_id;

  // Initial data pre-fetched for StudentDashboard (faster first paint)
  const [initialOrderData, setInitialOrderData] = useState(null);
  const [initialHistoryData, setInitialHistoryData] = useState(null);
  const [initialBackDesignData, setInitialBackDesignData] = useState(null);

  useEffect(() => {
    if (user && user.role === 'student') {
      Promise.all([
        getMyOrder(),
        getMyOrderHistory(),
        getMyClassBackDesigns()
      ]).then(([orderRes, historyRes, backDesignRes]) => {
        if (orderRes.data?.success) setInitialOrderData(orderRes.data.data);
        if (historyRes.data?.success) setInitialHistoryData(historyRes.data.data);
        if (backDesignRes.data?.success) setInitialBackDesignData(backDesignRes.data.data);
      }).catch(err => console.error("Initial data fetch error:", err));
    }
  }, [user]);

  useEffect(() => {
    if (getClassId) {
      fetchBackDesigns({ page: 1, limit: 100, class_id: getClassId });
    }
  }, [getClassId]);

  // Customizations ko localStorage mein debounce ke saath save karo
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('studentCustomizations', JSON.stringify(customizations));
      } catch (e) {
        console.warn('localStorage save failed:', e);
      }
    }, 800); // 800ms debounce — har keystroke pe save nahi hoga
    return () => clearTimeout(timer);
  }, [customizations]);

  // Working days complete hone ke baad localStorage cleanup
  useEffect(() => {
    const checkAndCleanup = () => {
      try {
        const holdDeadlineStr = localStorage.getItem('orderHoldDeadline');
        if (holdDeadlineStr) {
          const holdDeadline = new Date(holdDeadlineStr);
          const now = new Date();
          if (now > holdDeadline) {
            // Working days complete — saved data remove karo
            localStorage.removeItem('studentCustomizations');
            localStorage.removeItem('orderHoldDeadline');
            setCustomizations({});
            console.log('Order hold period expired — localStorage cleared');
          }
        }
      } catch (e) {
        console.warn('Cleanup check failed:', e);
      }
    };
    checkAndCleanup();
  }, []);

  // Sync isAppReady from PlayCanvas
  useEffect(() => {
    const handleMessage = (event) => {
      if (typeof event.data === 'string' && event.data === 'app:ready') {
        setIsAppReady(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sync state between tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'studentCustomizations' && e.newValue) {
        try { setCustomizations(JSON.parse(e.newValue)); } catch { }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);



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
      {/* COMMENTED: Back text feature disabled */}
      {/* {showBackTextPopup && (
        <BackTextPopup
          students={students}
          customizations={customizations}
          setCustomizations={setCustomizations}
          onFinish={() => setShowBackTextPopup(false)}
          isAppReady={isAppReady}
        />
      )} */}
      <Routes>
        <Route path="/" element={
          user ? (
            <>
              <StudentDashboard
                  customizations={customizations}
                  setCustomizations={setCustomizations}
                  setShowBackPopup={setShowBackPopup}
                  initialOrderData={initialOrderData}
                  initialHistoryData={initialHistoryData}
                  initialBackDesignData={initialBackDesignData}
                // setShowBackTextPopup={setShowBackTextPopup} // COMMENTED: Back text feature disabled
              />
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
