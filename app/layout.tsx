import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Car Crafter',
  description: 'AI car mod visualizer',
  icons: {
    icon: '/carcrafter.png', // uses public/carcrafter.png as favicon
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#0d0d0d] text-white">
        {children}
      </body>
    </html>
  )
}