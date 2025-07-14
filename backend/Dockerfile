# Use an official Python base image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install uv (modern Python package manager)
RUN curl -Ls https://astral.sh/uv/install.sh | sh && \
    cp /root/.local/bin/uv /usr/local/bin/uv

# Set workdir
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt ./

# Create virtual environment and install dependencies
# This layer will be cached unless requirements.txt changes
RUN uv venv .poke && \
    /bin/bash -c "source .poke/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"

# Copy source code and database after dependencies are installed
# This layer will only rebuild when source code changes
# Note: embedding_cache/ is mounted as a volume in docker-compose
COPY . .

# Set environment variables for Python
ENV VIRTUAL_ENV=/app/.poke
ENV PATH="/app/.poke/bin:$PATH"

# Expose port
EXPOSE 8000

# Run the FastAPI app
CMD ["/app/.poke/bin/python", "api.py"] 