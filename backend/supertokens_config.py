#!/usr/bin/env python3
"""
SuperTokens configuration for the Pokemon Card Scanner API.
This file configures SuperTokens with email OTP authentication.
"""

import os
from supertokens import init, InputAppInfo
from supertokens_python.recipe import emailpassword, session
from supertokens_python.recipe.emailpassword.interfaces import APIInterface, APIOptions
from supertokens_python.recipe.emailpassword.types import FormField
from supertokens_python.recipe.session.interfaces import APIInterface as SessionAPIInterface
from supertokens_python.recipe.session.framework.fastapi import verify_session

def init_supertokens():
    """Initialize SuperTokens with email OTP configuration."""
    
    # Get configuration from environment variables
    connection_uri = os.getenv("SUPERTOKENS_CONNECTION_URI", "http://localhost:3567")
    api_key = os.getenv("SUPERTOKENS_API_KEY", "your-api-key-here")
    
    # Initialize SuperTokens
    init(
        app_info=InputAppInfo(
            app_name="Pokemon Card Scanner",
            api_domain="localhost:8000",
            website_domain="localhost:8080",
            api_base_path="/auth",
            website_base_path="/auth"
        ),
        supertokens_config={
            "connection_uri": connection_uri,
            "api_key": api_key
        },
        framework="fastapi",
        recipe_list=[
            emailpassword.init(
                sign_up_feature=emailpassword.InputSignUpFeature(
                    form_fields=[
                        FormField(id="email", validate=lambda value, tenant_id: None)
                    ]
                ),
                sign_in_feature=emailpassword.InputSignInFeature(
                    form_fields=[
                        FormField(id="email", validate=lambda value, tenant_id: None)
                    ]
                ),
                override=emailpassword.InputOverrideConfig(
                    apis=emailpassword.APIInterface(
                        sign_up_post=lambda api_interface: api_interface,
                        sign_in_post=lambda api_interface: api_interface
                    )
                )
            ),
            session.init()
        ]
    )

def get_session_verifier():
    """Get the session verifier for protected routes."""
    return verify_session
