# UniRBAC — Unified Role-Based Access Control (TypeScript) [WIP]

UniRBAC is a modular, framework-agnostic authorization system for modern web applications. It combines a small, deterministic core engine (pure TypeScript) with thin integration packages for server runtimes and frontend frameworks. The design emphasizes a backend authoritative model, shared authorization logic, and adapter-driven extensibility.

Status: Concept / Initial design

Key features

- Role-based access control (RBAC) with role inheritance and levels
- Deterministic permission evaluation (allow / deny)
- Policy support (ABAC) for contextual rules
- Adapters for databases and framework integration
- Frontend helpers for permission-aware UIs (read-only)
