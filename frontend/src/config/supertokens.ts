// SuperTokens configuration for frontend
export const SuperTokensConfig = {
  appName: "Pokemon Scanner",
  apiDomain: import.meta.env.VITE_API_DOMAIN || "http://localhost:8000",
  apiBasePath: "/auth",
  superTokensDomain: import.meta.env.VITE_SUPERTOKENS_DOMAIN || "http://localhost:3567",
  superTokensBasePath: "/",
};

// TODO: Integrate with SuperTokens when backend is ready
// This configuration will be used in Phase 3 for real authentication
