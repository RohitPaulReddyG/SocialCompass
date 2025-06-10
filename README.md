
# Social Compass - Firebase Studio Project

Welcome to Social Compass! This is a Next.js application built with Firebase Studio, designed to help you understand and navigate your social energy.

## About The App

Social Compass helps you track your social interactions, monitor your energy levels (your "social battery"), gain AI-powered insights into what recharges or drains you, and reflect on your experiences in a private journal. The goal is to cultivate a healthier and more fulfilling social life.

## Current Features

*   **Dashboard:** A quick overview, including your current social battery.
*   **Interaction Logging:** Log details about your social encounters (who, what, when, how you felt before and after).
*   **Energy Timeline:** Visualize your social energy fluctuations over time with an interactive chart.
*   **AI-Powered Insights:** Get personalized insights by analyzing your logged interactions.
*   **Private Journal:** A space to write down deeper reflections and tag moods.
*   **User Authentication:** Secure sign-up and login using Firebase Authentication (currently Google Sign-In). User data (interactions, journal entries) will be stored in Firestore (migration in progress).

## Requirements

To run and develop this project locally, you will need:

*   **Node.js:** (Recommended version: 18.x or later)
*   **npm** or **yarn:** For managing project dependencies.
*   **Firebase Account:**
    *   A Firebase project set up at [console.firebase.google.com](https://console.firebase.google.com).
    *   **Authentication:** Google Sign-In method enabled.
    *   **Firestore Database:** Enabled in your Firebase project.
*   **Environment Variables:**
    *   A `.env.local` file in the root of your project (next to `package.json`).
    *   This file must contain your Firebase project configuration keys, prefixed with `NEXT_PUBLIC_`. Example:
        ```env
        NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
        NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"
        ```
        Replace `"YOUR_..."` with your actual Firebase project credentials.

## Getting Started

1.  **Clone the repository (if applicable).**
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up Firebase:**
    *   Ensure you have met all the Firebase-related requirements listed above.
    *   Create and populate your `.env.local` file in the project root with your Firebase credentials.
4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The app should now be running, typically at `http://localhost:9002` (or another port if 9002 is in use).
5.  **Genkit Development (Optional):**
    If you are working on AI features, you might need to run the Genkit development server:
    ```bash
    npm run genkit:dev
    ```

This project uses:
*   Next.js (with App Router)
*   React
*   TypeScript
*   Tailwind CSS
*   ShadCN UI components
*   Genkit (for AI features)
*   Firebase (Authentication, Firestore)

Feel free to explore the `src/app/page.tsx` to see the dashboard or other pages in the `src/app/` directory.
#
