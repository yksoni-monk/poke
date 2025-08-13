#!/usr/bin/env python3
"""
SuperTokens configuration for the Pokemon Card Scanner API.
This file configures SuperTokens with Passwordless email OTP authentication.
"""

import os
from supertokens_python import init, InputAppInfo, SupertokensConfig
from supertokens_python.recipe import passwordless, session
from supertokens_python.recipe.passwordless import ContactEmailOnlyConfig
from supertokens_python.recipe.session.framework.fastapi import verify_session

def init_supertokens():
    """Initialize SuperTokens with Passwordless email OTP configuration."""
    
    # Get configuration from environment variables
    connection_uri = os.getenv("SUPERTOKENS_CONNECTION_URI", "http://localhost:3567")
    
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

def get_session_verifier():
    """Get the session verifier for protected routes."""
    return verify_session
