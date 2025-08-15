import Passwordless, { PasswordlessComponentsOverrideProvider } from "supertokens-auth-react/recipe/passwordless";
import { PasswordlessPreBuiltUI } from "supertokens-auth-react/recipe/passwordless/prebuiltui";
import Session from "supertokens-auth-react/recipe/session";


// SuperTokens configuration for frontend
export const SuperTokensConfig = {
  appInfo: {
    appName: "Pokemon Scanner",
    apiDomain: import.meta.env.VITE_API_DOMAIN || "http://localhost",
    websiteDomain: window.location.origin,
    apiBasePath: "/auth",
    websiteBasePath: "/auth",
  },
  recipeList: [
    Session.init(),
    Passwordless.init({
      contactMethod: "EMAIL"
    }),
    
  ],
  getRedirectionURL: async (context: any) => {
    if (context.action === "SUCCESS") {
      return "/";
    }
    return undefined;
  },
};

export const PreBuiltUIList = [PasswordlessPreBuiltUI];

export const ComponentWrapper = (props: { children: React.ReactNode }): React.ReactNode => {
  return (
    <PasswordlessComponentsOverrideProvider components={{}}>
      {props.children}
    </PasswordlessComponentsOverrideProvider>
  );
};
