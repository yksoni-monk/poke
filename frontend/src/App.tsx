import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import SuperTokens, { SuperTokensWrapper } from "supertokens-auth-react";
import { ComponentWrapper, SuperTokensConfig } from "./config/supertokens.tsx";
import Index from "./pages/Index";
import Library from "./pages/Library";
import Auth from "./pages/Auth";

// Initialize SuperTokens - ideally in the global scope
SuperTokens.init(SuperTokensConfig);

const App = () => {
  console.log('App component rendering'); // Debug log

  return (
    <SuperTokensWrapper>
      <ComponentWrapper>
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
      </ComponentWrapper>
    </SuperTokensWrapper>
  );
};

export default App;
