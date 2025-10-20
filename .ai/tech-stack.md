# Tech Stack for Piggy Bank

## Backend
- **Supabase**: Provides a scalable serverless backend with built-in authentication, real-time features, and easy integration, ideal for handling user sessions, API endpoints, and data operations in the MVP without managing infrastructure.
- **Astro API Routes**: Enables lightweight server-side logic and API handling directly within the Astro framework, reducing complexity for simple CRUD operations on wallets and instruments.

## Frontend
- **Astro 5**: A modern static site builder that supports hybrid rendering and partial hydration, allowing fast performance for the dashboard while integrating interactive components seamlessly.
- **TypeScript 5**: Adds static type checking to JavaScript, enhancing code reliability, maintainability, and developer productivity for the type-heavy financial data structures.
- **React 19**: Delivers powerful component-based UI development with optimized rendering and new hooks, perfect for dynamic elements like charts and editable forms in the app.
- **Tailwind CSS 4**: A utility-first CSS framework that accelerates responsive design and styling, ensuring consistent and customizable UI without writing custom CSS.
- **Shadcn/ui**: Offers accessible, customizable React components built on Tailwind and Radix UI, speeding up the creation of professional forms, modals, and visualizations.

## Database
- **Supabase (PostgreSQL)**: A managed Postgres database with real-time subscriptions and row-level security, providing robust relational storage for user wallets, instruments, and goals while supporting easy querying and authentication integration.

## CI/CD
- **GitHub Actions**: Integrated CI/CD workflows with GitHub for automated testing, linting, and deployment to platforms like Vercel, ensuring reliable builds and releases at no additional cost for open-source or small projects.
