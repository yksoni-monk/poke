# Use an official Python base image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install uv (modern Python package manager)
RUN curl -Ls https://astral.sh/uv/install.sh | sh && \
    cp /root/.local/bin/uv /usr/local/bin/uv

# Set workdir
WORKDIR /app

# Copy requirements and source code
COPY requirements.txt ./
COPY . ./

# Create and activate virtual environment, install dependencies
RUN uv venv .poke && \
    /bin/bash -c "source .poke/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"

# Set environment variables for Python
ENV VIRTUAL_ENV=/.poke
ENV PATH="/.poke/bin:$PATH"

# Expose port
EXPOSE 8000

# Run the FastAPI app
CMD ["/app/.poke/bin/python", "api.py"] 