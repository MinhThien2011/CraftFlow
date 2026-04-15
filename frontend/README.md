# Frontend Admin Dashboard

A modern, full-featured admin dashboard built with **Next.js 15**, **TypeScript**, and **Tailwind CSS**.

## ✨ Features

- 🎨 **Modern UI Components** - Rich collection of reusable UI components (buttons, cards, tables, modals, etc.)
- 📊 **Dashboard Pages** - Multiple admin pages including dashboard, users, products, inventory, and reports
- 📱 **Responsive Design** - Fully responsive layout that works on desktop and mobile devices
- 🌓 **Dark Mode Support** - Built-in theme provider for light/dark mode
- 📈 **Analytics & Reports** - Dedicated pages for reports and AI-powered analytics
- 💰 **AI Pricing** - AI-driven pricing management interface
- 🎯 **AI Marketing** - Marketing automation and management tools
- ⚙️ **Settings & Profile** - User settings and profile management
- 🔔 **Alerts System** - Alert dialog and notification components
- 🎨 **Production Management** - Production workflow management

## 📂 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── dashboard/         # Dashboard page
│   ├── users/             # Users management
│   ├── products/          # Products management
│   ├── inventory/         # Inventory management
│   ├── reports/           # Reports page
│   ├── production/        # Production management
│   ├── ai-pricing/        # AI pricing page
│   ├── ai-marketing/      # AI marketing page
│   ├── alerts/            # Alerts page
│   └── settings/          # Settings page
├── components/            # Reusable components
│   ├── app-header.tsx    # Header component
│   ├── app-sidebar.tsx   # Sidebar navigation
│   ├── app-shell.tsx     # Layout shell
│   ├── theme-provider.tsx # Theme configuration
│   └── ui/               # UI component library
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and types
├── utils/                 # Helper functions
├── styles/               # Global CSS
└── types/                # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Or with yarn
yarn install
```

### Development

```bash
# Start development server
npm run dev

# Or with yarn
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🛠 Tech Stack

- **Framework**: Next.js 15 (React 18+)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + PostCSS
- **Components**: Custom component library
- **UI Elements**: Shadcn/ui inspired components
- **Package Manager**: npm/yarn

## 📦 Key Dependencies

- React & React DOM
- Next.js 15
- TypeScript
- Tailwind CSS
- Lucide React (icons)

See `package.json` for complete dependency list.

## 🎯 Available Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | Main dashboard with analytics |
| Users | `/users` | User management interface |
| Products | `/products` | Product catalog management |
| Inventory | `/inventory` | Inventory tracking |
| Reports | `/reports` | Data reports and analysis |
| Production | `/production` | Production workflows |
| AI Pricing | `/ai-pricing` | AI-powered pricing tools |
| AI Marketing | `/ai-marketing` | Marketing automation |
| Alerts | `/alerts` | Alert management |
| Settings | `/settings` | User settings |

## 🎨 UI Components

The project includes a comprehensive component library in `src/components/ui/`:

- Accordion, Alert, Avatar, Badge
- Button, Button Group
- Card, Carousel, Checkbox, Command
- Dialog, Drawer, Dropdown Menu
- Form, Input, Input Group, Input OTP
- Label, Menubar
- Pagination, Popover, Progress
- Radio Group, Resizable
- Scroll Area, Select, Sheet, Sidebar
- Skeleton, Slider, Spinner
- Table, Tabs, Textarea, Toast
- Toggle, Tooltip
- And more...

## 🔧 Configuration Files

- `next.config.mjs` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration
- `components.json` - Component configuration

## 📝 Scripts

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm start           # Start production server

# Type checking
npm run type-check  # Run TypeScript type checking

# Linting
npm run lint        # Run ESLint
```

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

This project is licensed under the MIT License.

## 💡 Tips

- Explore the `src/lib/mock-data.ts` for sample data
- Check `src/components/ui/` for available components
- Use `src/hooks/` for custom React hooks
- Review `src/config/` for application configuration

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

**Created**: April 2026  
**Version**: 1.0.0
