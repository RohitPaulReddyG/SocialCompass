# Installing Project Dependencies

This project uses Node.js and npm (or yarn) to manage its dependencies. The `package.json` file in the root of the project lists all required packages.

## Standard Installation (Recommended)

The easiest and recommended way to install all dependencies is to navigate to the project's root directory in your terminal and run:

```bash
npm install
```

Or, if you use Yarn:

```bash
yarn install
```

This single command will download and install all necessary packages listed in `package.json`.

## Individual Installation Commands (For Reference)

If you need to install dependencies one by one for any reason, here are the commands.

### Runtime Dependencies

These are packages required for the application to run.

```bash
npm install @genkit-ai/googleai
npm install @genkit-ai/next
npm install @hookform/resolvers
npm install @radix-ui/react-accordion
npm install @radix-ui/react-alert-dialog
npm install @radix-ui/react-avatar
npm install @radix-ui/react-checkbox
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-label
npm install @radix-ui/react-menubar
npm install @radix-ui/react-popover
npm install @radix-ui/react-progress
npm install @radix-ui/react-radio-group
npm install @radix-ui/react-scroll-area
npm install @radix-ui/react-select
npm install @radix-ui/react-separator
npm install @radix-ui/react-slider
npm install @radix-ui/react-slot
npm install @radix-ui/react-switch
npm install @radix-ui/react-tabs
npm install @radix-ui/react-toast
npm install @radix-ui/react-tooltip
npm install @tanstack-query-firebase/react
npm install @tanstack/react-query
npm install class-variance-authority
npm install clsx
npm install date-fns
npm install dotenv
npm install firebase
npm install genkit
npm install lucide-react
npm install next
npm install patch-package
npm install react
npm install react-day-picker
npm install react-dom
npm install react-hook-form
npm install recharts
npm install tailwind-merge
npm install tailwindcss-animate
npm install zod
```

### Development Dependencies

These packages are typically only needed during development (e.g., for type checking, linting, build tools).

```bash
npm install --save-dev @types/node
npm install --save-dev @types/react
npm install --save-dev @types/react-dom
npm install --save-dev genkit-cli
npm install --save-dev postcss
npm install --save-dev tailwindcss
npm install --save-dev typescript
```
