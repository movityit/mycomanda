<div align="center">

<p align="center">
  <img src="public/banner.png" alt="Banner" width="100%" />
</p>

# 🧾 MyComanda

**Order & Display Management System for Kitchens, Tables, and Counters**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

[Features](#-features) • [Installation](#-installation) • [Docker](#-docker-deployment) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## 📖 About

**MyComanda** is a real-time order management and display system built with Next.js. Specialized for restaurants, sagre, and festivals, it provides kitchen display screens, table management, counter (vassoio) tracking, and a manager panel — all in one application.

Part of the **MySagra** ecosystem, MyComanda integrates seamlessly with backend services to deliver a complete order tracking solution.

## ✨ Features

### 🎯 Core Functionality
- **Kitchen Display** — real-time preparation orders organized by station
- **Tables Display** — table-based overview of all active orders
- **Counter (Vassoio) Display** — vassoio/banco order tracking
- **Manager Panel** — advance orders through *In Preparation* → *Ready* → *Picked Up* stages with mark/undo per item
- **Customer Display** — public screen showing ready orders with automatic pagination and hybrid mode
- **Real-time Updates** — instant order state changes via Server-Sent Events (SSE) + 30s polling fallback
- **Workday-aware Filtering** — orders automatically scoped to the current day's shift (08:00–07:59)
- **Station-based Filtering** — kitchen display per-station with empty station handling
- **NO_TABLE Exclusion** — asporto/banco orders excluded from tables view

### 🖥️ Display Modes
- **`standard`** — shows ready orders for customer pickup
- **`public`** — public-facing display with pagination and announcement ticker
- **`kitchen`** — kitchen station orders grouped by station
- **`tables`** — table-based order overview
- **`manager`** — staff panel for full order lifecycle management
- **`comanda`** — counter (vassoio) command view

### 🎨 User Experience
- **Modern UI** — built with shadcn/ui components and Radix UI primitives
- **Dark/Light Mode** — theme switching with next-themes
- **Auto Pagination** — cycles through pages automatically when orders overflow the grid
- **Progress Bar** — animated countdown showing time until next page turn
- **Responsive Layout** — optimized for large TV/monitor displays

### 🔐 Security & Authentication
- **Secure Authentication** — NextAuth v4 integration with session management
- **Protected Routes** — staff pages require authentication; display/comanda screens are public

## 🚀 Installation

### Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn**
- Access to MySagra backend API

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/MySagra/mycomanda.git
   cd mycomanda
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.template` to `.env` and adjust values:
   ```env
   # Backend API URL
   API_URL=http://mysagra-backend:4300

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3035
   NEXTAUTH_SECRET=your_secure_random_secret_here
   ```

   > **Note**: `API_URL` is used server-side only and is never exposed to the client.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3035](http://localhost:3035)

## 🐳 Docker Deployment

MyComanda includes full Docker support for production deployments.

### Using Docker Compose

1. **Ensure you have a `.env` file configured** (see Installation section)

2. **Build and run the container**
   ```bash
   docker compose up -d
   ```

3. **Access the application**

   The application will be available at [http://localhost:3035](http://localhost:3035)

### Docker Configuration

The application uses a multi-stage Dockerfile for optimized builds:
- **Dependencies stage** — installs npm packages
- **Builder stage** — builds the Next.js application
- **Runner stage** — minimal production image running as a non-root user

The container connects to the `mysagra_default` external network to communicate with the backend.

```bash
# Create the network if it doesn't exist yet
docker network create mysagra_default
```

## 🛠️ Tech Stack

### Frontend Framework
- **[Next.js 16](https://nextjs.org/)** — React framework with App Router
- **[React 19](https://reactjs.org/)** — UI library
- **[TypeScript 5](https://www.typescriptlang.org/)** — type safety

### UI Components & Styling
- **[shadcn/ui](https://ui.shadcn.com/)** — re-usable component library
- **[Radix UI](https://www.radix-ui.com/)** — unstyled, accessible components
- **[Tailwind CSS 4](https://tailwindcss.com/)** — utility-first CSS framework
- **[Lucide React](https://lucide.dev/)** — icon library

### Forms & Validation
- **[React Hook Form](https://react-hook-form.com/)** — form state management
- **[Zod](https://zod.dev/)** — schema validation
- **[@hookform/resolvers](https://github.com/react-hook-form/resolvers)** — form validation integration

### Authentication
- **[NextAuth v4](https://next-auth.js.org/)** — authentication for Next.js

### Real-time & API
- **[@microsoft/fetch-event-source](https://github.com/Azure/fetch-event-source)** — Server-Sent Events support
- **Next.js API Routes** — server-side proxy to backend

### Utilities
- **[clsx](https://github.com/lukeed/clsx)** — conditional className utility
- **[tailwind-merge](https://github.com/dcastil/tailwind-merge)** — merge Tailwind classes
- **[sonner](https://sonner.emilkowal.ski/)** — toast notifications
- **[vaul](https://vaul.emilkowal.ski/)** — drawer component
- **[next-themes](https://github.com/pacocoursey/next-themes)** — dark/light mode

## 📁 Project Structure

```
mycomanda/
├── app/
│   ├── (login)/           # Login page
│   ├── api/               # API routes (proxy to backend, SSE, announcements)
│   ├── comanda/           # Counter/vassoio command view
│   ├── display/           # Public customer display screen
│   ├── manager/           # Staff order management panel
│   └── settings/          # App settings page
├── components/
│   ├── comanda/           # Comanda (counter) components
│   ├── display/           # Display screen components
│   ├── manager/           # Manager panel components
│   ├── settings/          # Settings card components
│   └── ui/                # Base UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/                   # Auth configuration and shared utilities
├── types/                 # TypeScript type definitions
├── utils/                 # Shared utility functions
├── public/                # Static assets
├── Dockerfile             # Docker configuration
└── docker-compose.yml     # Docker Compose configuration
```

## 📄 Pages

| Route | Description | Access |
|-------|-------------|--------|
| `/` | Login | Public |
| `/comanda` | Counter/vassoio command view | Public |
| `/manager` | Staff order management panel | Authenticated |
| `/display` | Public customer display screen | Public |
| `/display/kitchen` | Kitchen station display | Public |
| `/display/tables` | Table-based order overview | Public |
| `/settings` | Display mode, appearance & event settings | Authenticated |

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3035 |
| `npm run build` | Build production bundle |
| `npm start` | Start production server on port 3035 |
| `npm run lint` | Run ESLint for code quality |

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_URL` | Backend API URL (server-side only) | `http://mysagra-backend:4300` |
| `NEXTAUTH_SECRET` | Secret key for NextAuth sessions | Random string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Application URL for auth callbacks | `http://localhost:3035` |

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```

4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Write meaningful commit messages
- Update documentation for significant changes
- Test your changes thoroughly before submitting
- Ensure TypeScript types are properly defined

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

This means:
- ✅ You can use, modify, and distribute this software
- ✅ You must disclose source code of any modifications
- ✅ You must license derivative works under AGPL-3.0
- ✅ Network use counts as distribution (must provide source)

See the [LICENSE](LICENSE) file for full details.

## 🙏 Acknowledgments

- Originally based on [MyNumeri](https://github.com/MySagra/mynumeri) from the [MySagra](https://github.com/MySagra) ecosystem
- Developed by [movityit](https://github.com/movityit) with the assistance of AI
- Built with [Next.js](https://nextjs.org/) by Vercel
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Authentication powered by [NextAuth](https://next-auth.js.org/)
- Icons from [Lucide](https://lucide.dev/)

## 📞 Support

If you encounter any issues or have questions:

- 🐛 [Open an issue](https://github.com/MySagra/mycomanda/issues)
- 💬 Check existing issues for solutions
- 📧 Contact the MySagra team

---

<div align="center">

**Maintained by [movityit](https://github.com/movityit) — originally from the MySagra ecosystem**

[⬆ Back to Top](#-mycomanda)

</div>
