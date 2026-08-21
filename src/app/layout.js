import './globals.css';

export const metadata = {
  title: 'Private AI Chat UI',
  description: 'Self-hosted, private AI chat for Gemini, Claude, and local or OpenAI-compatible models. Bring your own key; your data stays on your machine.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
