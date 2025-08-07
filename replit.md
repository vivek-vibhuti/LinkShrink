# Overview

SnapLink is a professional URL shortening service that allows users to create short links with custom aliases, generate QR codes, and track detailed analytics. The application supports both anonymous users (with basic functionality) and authenticated users (with enhanced features including analytics, bulk operations, and premium subscriptions). Built with a modern full-stack architecture using React, Express, and PostgreSQL.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 19 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: Custom component library built on Tailwind CSS with shadcn/ui patterns
- **Styling**: Tailwind CSS with CSS custom properties for theme variables
- **Build Tool**: Vite for fast development and optimized production builds

**Design Rationale**: This frontend stack provides excellent developer experience with fast builds, strong typing, and modern React patterns. The component-based architecture with Tailwind ensures consistent styling and maintainable code.

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the stack
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: JWT tokens with bcrypt password hashing
- **Session Management**: Express sessions with PostgreSQL store
- **Security**: Helmet for security headers, CORS for cross-origin requests
- **API Design**: RESTful endpoints with consistent error handling

**Design Rationale**: Express provides a mature, flexible foundation for the API. Drizzle ORM offers excellent TypeScript integration and performance. JWT authentication provides stateless authentication suitable for modern web applications.

## Database Architecture
- **Primary Database**: PostgreSQL with Neon Database hosting
- **Schema Management**: Drizzle migrations for version-controlled schema changes
- **Key Tables**:
  - `users`: User accounts with premium status tracking
  - `urls`: Shortened links with metadata and custom aliases
  - `urlClicks`: Click tracking for analytics
  - `urlAnalytics`: Aggregated analytics data
  - `sessions`: Session storage for authentication

**Design Rationale**: PostgreSQL provides ACID compliance and advanced features needed for analytics. The normalized schema design supports efficient querying while maintaining data integrity.

## Authentication & Authorization
- **Strategy**: JWT-based authentication with optional anonymous usage
- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: Express sessions for server-side state
- **Authorization Levels**: Anonymous users (basic features) and authenticated users (full features)

## Analytics System
- **Click Tracking**: Real-time click recording with user agent parsing
- **Data Aggregation**: Browser, OS, country, and referrer analytics
- **Performance**: Efficient queries with proper indexing for analytics dashboards

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support**: Uses `ws` library for Neon's serverless WebSocket connections

## Payment Processing
- **Stripe**: Premium subscription management and payment processing
- **Integration**: Customer creation, subscription handling, and webhook processing

## Utility Services
- **QR Code Generation**: `qrcode` library for creating QR codes for shortened URLs
- **ID Generation**: `nanoid` for generating unique short codes and IDs

## Development & Build Tools
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Frontend build tool and development server
- **Drizzle Kit**: Database migration and schema management
- **PostCSS**: CSS processing with Tailwind CSS integration

## UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **Recharts**: Chart library for analytics visualization
- **Class Variance Authority**: Type-safe styling variants

## Form Handling & Validation
- **React Hook Form**: Performant form management
- **Zod**: Runtime type validation and schema definitions
- **Hookform Resolvers**: Integration between React Hook Form and Zod