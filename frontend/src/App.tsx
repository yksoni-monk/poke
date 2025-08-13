import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Library from "./pages/Library";
import Auth from "./pages/Auth";

const App = () => {
  console.log('App component rendering'); // Debug log

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            <Route path="/" element={
              <ProtectedRoute requireAuth={false}>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/auth" element={<Auth />} />
            <Route path="/library" element={
              <ProtectedRoute requireAuth={true}>
                <Library />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
