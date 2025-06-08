// app/layout.js
import './globals.css';

export const metadata = {
  title: 'OpenChat',
  description: 'AAA-Quality Chat Interface for OpenRouter',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-gray-800 to-gray-900 min-h-screen text-gray-200 font-sans overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
