# Offline Question Paper Maker (QPMS)

![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Android-blue?style=flat-square)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-1199F4?style=flat-square&logo=capacitor&logoColor=white)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)

**Offline Question Paper Maker (QPMS)** is an offline-first application designed to simplify question bank management and examination paper generation for educators and academic institutions.

Built with React, Vite, and Capacitor, QPMS enables users to organize questions, configure examination blueprints, generate randomized question papers, and export them as PDFs. The application prioritizes local data storage, privacy, and usability across web and Android platforms.

## Features

- **Question Bank Management:** Create, edit, delete, and organize questions by subject, type, difficulty, and marks.
- **Blueprint-Based Generation:** Configure examination sections and automatically select questions according to specified criteria.
- **PDF Export:** Generate printable examination papers using jsPDF.
- **Bulk CSV Import:** Import existing question banks using Papa Parse.
- **Backup and Restore:** Export and import application data through JSON backup files.
- **Offline-First Design:** Perform core operations locally without requiring a remote backend.
- **Responsive Interface:** React-based interface with Tailwind CSS styling.
- **Android Support:** Package the application as a native Android app using Capacitor.
- **Testing and Code Quality:** Use Vitest for automated tests and ESLint for code quality checks.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React 19 |
| Routing | React Router |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Native Integration | Capacitor 8 |
| Database | SQLite |
| PDF Generation | jsPDF |
| CSV Processing | Papa Parse |
| Unique Identifiers | UUID |
| Testing | Vitest, React Testing Library, jsdom |
| Linting | ESLint |
| Android Build | Gradle, Android SDK |

## Architecture

QPMS separates the user interface, application logic, and data persistence to support maintainability and platform compatibility.

```text
                    QPMS Application
                           |
                     React Frontend
                           |
              +------------+------------+
              |                         |
       Application Logic          User Interface
              |
       Data Management Services
              |
       +------+-------+
       |              |
   Question Bank   Paper Generation
       |              |
       +------+-------+
              |
       Local Data Storage
              |
       SQLite / Platform
       Storage Integration
              |
       PDF Export / JSON Backup
```

The Android application uses Capacitor to integrate the React frontend with native functionality. Browser-based development may require a separate web-compatible persistence implementation.

## Getting Started

### Prerequisites

Install the following tools:

- Node.js and npm
- Git
- Java JDK 17 for Android builds
- Android SDK for Android compilation

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/Sagarrajak01/QPMS-offline-app.git
cd QPMS-offline-app
```

**2. Install dependencies**

```bash
npm ci
```

**3. Start the development server**

```bash
npm run dev
```

Open the local URL displayed in the terminal to access the application.

## Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production frontend |
| `npm run preview` | Preview the production build |
| `npm run lint` | Check code quality using ESLint |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |

## Build for Android

QPMS uses Capacitor to package the web application for Android.

**1. Build the frontend**

```bash
npm run build
```

**2. Synchronize the Android project**

```bash
npx cap sync android
```

**3. Generate a debug APK**

```bash
cd android
./gradlew assembleDebug
```

The generated APK is typically located at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Java JDK 17, the Android SDK, and a configured Capacitor Android project are required.

## Data Management

QPMS is designed to keep application data local and minimize dependence on external services.

- **SQLite:** Stores structured data in supported native environments.
- **CSV Import:** Enables bulk question bank migration.
- **JSON Backup:** Supports manual data export and restoration.
- **PDF Export:** Generates examination papers locally.

Users should store backup files securely because they may contain examination questions and answer keys.

## Testing and Code Quality

Run the automated tests:

```bash
npm run test
```

Check the codebase for linting issues:

```bash
npm run lint
```

Build the production frontend:

```bash
npm run build
```

These commands help validate application behavior, code quality, and production build compatibility.

## Project Structure

```text
QPMS-offline-app/
├── android/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   └── assets/
├── .github/
│   └── workflows/
├── capacitor.config.*
├── package.json
├── package-lock.json
├── vite.config.*
└── README.md
```

---