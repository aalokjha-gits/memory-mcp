# Contributing to memory-mcp

Thank you for your interest in contributing to the memory-mcp project. This project provides an MCP server for AI agent memory using TypeScript and Node.js.

## Development Environment Setup

To start developing on this project, ensure you have Node.js 18 or higher installed.

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure you have the following services running:
   - Qdrant vector database.
   - An embedding service (OpenAI, Ollama, or a custom local server).

## Available Scripts

- Build the project:
  ```bash
  npm run build
  ```
- Run tests (Vitest):
  ```bash
  npm test
  ```
- Run in development mode (tsx):
  ```bash
  npm run dev
  ```

## Code Style Guidelines

Maintain the following standards in your contributions:
- Use strict TypeScript.
- Follow ESM (ECMAScript Modules) patterns.
- Do not use `any` types. Provide explicit type definitions for all variables and functions.
- Write concise and self-documenting code.

## Pull Request Process

1. Create a new branch from `main`.
2. Implement your changes.
3. Ensure all tests pass and the build succeeds.
4. Submit a PR against the `main` branch.

## Reporting Issues

Use the provided issue templates for bug reports and feature requests. Provide clear descriptions and steps to reproduce any bugs you find.
