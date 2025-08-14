#!/usr/bin/env python3
"""
SuperTokens configuration for the Pokemon Card Scanner API.
This file configures SuperTokens with Passwordless email OTP authentication.
"""

import os
import sys
from supertokens_python import init, InputAppInfo, SupertokensConfig
from supertokens_python.recipe import passwordless, session
from supertokens_python.recipe.passwordless import ContactEmailOnlyConfig

def init_supertokens():
    """Initialize SuperTokens with Passwordless email OTP configuration."""
    
    print("🔧 SuperTokens config: Starting initialization...", file=sys.stderr)
    
    # Get configuration from environment variables
    connection_uri = os.getenv("SUPERTOKENS_CONNECTION_URI", "http://localhost:3567")
    print(f"🔧 SuperTokens config: Connection URI: {connection_uri}", file=sys.stderr)
    
    print("🔧 SuperTokens config: About to call supertokens.init()...", file=sys.stderr)
    
    # Initialize SuperTokens
    init(
        app_info=InputAppInfo(
            app_name="Pokemon Card Scanner",
            api_domain="localhost:8000",
            website_domain="localhost:8080",
            api_base_path="/auth",
            website_base_path="/auth"
        ),
        supertokens_config=SupertokensConfig(
            connection_uri=connection_uri
        ),
        framework='fastapi',
        recipe_list=[
            session.init(), # initializes session features
            passwordless.init(
                flow_type="USER_INPUT_CODE",
                contact_config=ContactEmailOnlyConfig()
            )
        ],
        mode='asgi' # use wsgi if you are running using gunicorn
    )
    
    print("🔧 SuperTokens config: Initialization complete!", file=sys.stderr)
