# Contributing to Zynex

First off, thank you for considering contributing to Zynex! 🎉 Every contribution helps make this project better for everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#-reporting-bugs)
  - [Suggesting Features](#-suggesting-features)
  - [Code Contributions](#-code-contributions)
- [Development Setup](#-development-setup)
- [Code Style](#-code-style)
- [Pull Request Process](#-pull-request-process)
- [Community](#-community)

---

## Code of Conduct

This project and everyone participating in it is governed by the [Zynex Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## How Can I Contribute?

### 🐛 Reporting Bugs

Found a bug? We'd love to know about it. Please open an issue with the following information:

1. **Title**: A clear, descriptive title
2. **Description**: What happened vs. what you expected
3. **Steps to Reproduce**: Minimal steps to trigger the bug
4. **Environment**: OS, Python version, browser (if frontend-related)
5. **Screenshots/Logs**: If applicable, include error messages or screenshots

**Use the bug report template** when creating a new issue.

### 💡 Suggesting Features

Have an idea for a new feature? We welcome suggestions!

1. **Check existing issues** first to avoid duplicates
2. **Open a new issue** with the "Feature Request" label
3. **Describe the feature** — what problem does it solve?
4. **Share examples** — how would it work from a user's perspective?

### 🔧 Code Contributions

Ready to write some code? Here's how to get started:

1. **Fork** the repository
2. **Create a branch** from `main` for your changes
3. **Make your changes** following our [code style](#-code-style)
4. **Test your changes** thoroughly
5. **Submit a pull request**

---

## 🛠️ Development Setup

### Prerequisites

- Python 3.10 or higher
- Git

### Setting Up Your Development Environment

```bash
# 1. Fork and clone the repository
git clone https://github.com/ShahabAhmed01/zynex-ai.git
cd zynex-ai

# 2. Create a virtual environment
python -m venv venv

# 3. Activate it
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 4. Install all dependencies (including dev tools)
pip install -r requirements.txt
pip install -e ".[dev]"

# 5. Set up environment
cp .env.example .env

# 6. Run the development server
python run.py
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend

# Run specific test file
pytest tests/test_pipeline.py
```

---

## 🎨 Code Style

We use the following tools to maintain consistent code quality:

| Tool | Purpose | Config |
|------|---------|--------|
| **[Black](https://black.readthedocs.io)** | Code formatter | `line-length = 100` |
| **[isort](https://pycqa.github.io/isort/)** | Import sorting | `profile = "black"` |
| **[Ruff](https://docs.astral.sh/ruff/)** | Linter | See `pyproject.toml` |
| **[mypy](https://mypy.readthedocs.io)** | Type checking | See `pyproject.toml` |

### Before Committing

```bash
# Format code
black .
isort .

# Lint
ruff check .

# Type check
mypy backend/
```

### General Guidelines

- **Write docstrings** for all public functions and classes
- **Use type hints** for function parameters and return types
- **Keep functions small** — each function should do one thing
- **Write meaningful commit messages** following [Conventional Commits](https://www.conventionalcommits.org):
  - `feat: add voice summary export`
  - `fix: resolve PDF export crash on empty charts`
  - `docs: update API endpoint documentation`
  - `refactor: simplify pipeline stage management`

---

## 🔀 Pull Request Process

1. **Update documentation** if your changes affect the public API or user-facing features
2. **Add tests** for new functionality
3. **Ensure all tests pass** before submitting
4. **Fill out the PR template** with a clear description of your changes
5. **Link related issues** using `Closes #123` in the PR description
6. **Request a review** from a maintainer

### PR Review Checklist

- [ ] Code follows the project's style guidelines
- [ ] Tests are added/updated for new functionality
- [ ] Documentation is updated if needed
- [ ] All CI checks pass
- [ ] No unnecessary files are included

### What to Expect

- A maintainer will review your PR within a few days
- You may be asked to make changes — this is normal and collaborative
- Once approved, your PR will be merged into `main`

---

## 🌟 Community

- **Questions?** Open a [Discussion](https://github.com/ShahabAhmed01/zynex-ai/discussions)
- **Found a security issue?** See [SECURITY.md](SECURITY.md) for responsible disclosure

---

Thank you for contributing to Zynex! ⚡
