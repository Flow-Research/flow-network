# Lightweight container for Flow harness verification in CI.
# Provides Node.js, Python, uv, pnpm, git — enough to run install.sh + harness:verify.
#
# Usage:
#   docker build -t harnessy-verify tests/harness/
#   docker run --rm -v "$(pwd):/source/harnessy:ro" harnessy-verify

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV HOME=/root
ENV PATH="/root/.local/bin:/root/.cargo/bin:$PATH"

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    python3 \
    python3-pip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# pnpm
RUN npm install -g pnpm@latest

# uv (Python package manager for Jarvis)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Working directory for the install target
WORKDIR /workspace

# Default: run the CI verification script
ENTRYPOINT ["/bin/bash"]
CMD ["/source/harnessy/tests/harness/run-ci-verify.sh"]
