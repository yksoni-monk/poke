# Use an official Python base image
FROM python:3.11-slim

# Copy UV package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install system dependencies - this rarely changes
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy only dependency files first
COPY pyproject.toml uv.lock ./

# Install Python dependencies using uv with pyproject.toml
# This layer will be cached unless dependencies change
RUN uv sync --frozen

# Copy source code after dependencies are installed
# This layer will only rebuild when source code changes
# Note: pokemon_cards.db and embedding_cache/ are mounted as volumes in docker-compose
COPY . .

# Set environment variables for Python
#ENV VIRTUAL_ENV=/app/.poke
ENV PATH="/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Run the FastAPI app
CMD ["/app/.venv/bin/python", "api.py"] 