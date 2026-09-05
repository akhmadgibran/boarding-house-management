# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-06

This is a major architectural overhaul migrating the backend from Node.js (Express + Prisma + MySQL) to a high-performance Golang (Chi + pgx + sqlc + PostgreSQL) stack.

### Added
- **Backend**: Implemented Domain-Driven Design (DDD) architecture in Golang (`server-go/`).
- **Database**: Migrated to PostgreSQL, replacing MySQL.
- **Database**: Introduced `sqlc` for type-safe SQL query generation.
- **Database**: Included new PostgreSQL-compatible seeder (`docs/postgres_seed.sql`).
- **Deployment**: Updated `docker-compose.yml` for the new Golang and PostgreSQL services.
- **Frontend**: Added API interceptor logic to route Next.js calls to the Golang backend seamlessly.

### Changed
- **Backend**: Completely replaced the Express.js server with a Golang `net/http` server using Chi router.
- **Frontend**: Removed dependency on Prisma types in the client; mapped Golang JSON structures to align with frontend types.
- **Database**: Changed `room` and `asset` relation strategies to utilize Postgres `json_build_object` and `json_agg`.
- **Localization**: Translated user-facing strings in the backend and frontend components from Indonesian to English (while retaining some established UI texts).

### Removed
- **Backend**: Deprecated and deleted the old Node.js `server/` codebase entirely.
- **Database**: Removed Prisma ORM schema and migrations.

## [0.1.0] - 2026-09-05

This is the initial public release focusing on repository cleanup, documentation standardization, and security audits to prepare the project for open-source and standard industry deployment.

### Added
- **Documentation**: Added comprehensive `README.md` with project overview, tech stack, and setup instructions.
- **Documentation**: Introduced `CHANGELOG.md` to track project history using standard conventions.
- **Configuration**: Added robust root `.gitignore` and `backend/.gitignore` tailored for Node.js/TypeScript monorepos.
- **Configuration**: Added `frontend/.env.example` to document required frontend environment variables.
- **Version Control**: Initialized clean Git repository for standardized tracking.

### Changed
- **Documentation**: Consolidated scattered documentation files (`PROJECT_OVERVIEW.md`, `DESIGN.md`, `PROJECT_STRUCTURE.md`) from the `frontend/` directory into a centralized `docs/` folder.
- **Security**: Anonymized `CORS_ORIGIN` domain in `backend/.env.production.example` for secure public sharing.

### Removed
- **Cleanup**: Purged redundant one-off scripts (`patch.js`, `patch.py`) and API response dumps (`response*.json`) from the project root.
- **Cleanup**: Removed backend temporary and testing artifacts (`test-adapter.*`, `test-query.js`, `token.json`, `scratch/` directory).
- **Cleanup**: Removed unused auto-generated artifacts (`generate_seed.py`, `Template_Import_Kost_V3.xlsx`, `kost_seed_data_temp.sql`).
- **Cleanup**: Excluded compiled backend build outputs (`backend/dist/`) from tracking.
- **Cleanup**: Deleted unused `create-next-app` boilerplate SVGs from `frontend/public/`.
