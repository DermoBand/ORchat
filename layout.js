// app/layout.js
import './globals.css';
import Head from 'next/head';

export const metadata = {
  title: 'OpenChat',
  description: 'AAA-Quality Chat Interface for OpenRouter',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
      </Head>
      <body className="bg-gradient-to-br from-gray-800 to-gray-900 min-h-screen text-gray-200 font-sans overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
