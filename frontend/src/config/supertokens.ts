// SuperTokens configuration for future use
export const SuperTokensConfig = {
  appName: "Pokemon Scanner",
  apiDomain: import.meta.env.VITE_API_DOMAIN || "http://localhost:8000",
  apiBasePath: "/auth",
  superTokensDomain: import.meta.env.VITE_SUPERTOKENS_DOMAIN || "http://localhost:3567",
  superTokensBasePath: "/",
};

// TODO: Integrate with SuperTokens when backend is ready
