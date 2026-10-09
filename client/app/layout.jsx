import './globals.css';

export const metadata = {
  title: 'Taskflow — Make room for what matters',
  description: 'A calm, focused place to plan your day and get things done.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
